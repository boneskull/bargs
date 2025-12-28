// src/parser-new.ts
import { parseArgs } from 'node:util';

import type {
  AnyCommandConfig,
  BargsConfigWithCommands,
  BargsResult,
  InferOptions,
  InferPositionals,
  OptionDef,
  OptionsSchema,
  PositionalDef,
  PositionalsSchema,
} from './types.js';

import { HelpError } from './errors.js';

/**
 * Build parseArgs options config from our options schema.
 */
const buildParseArgsConfig = (
  schema: OptionsSchema,
): Record<string, { multiple?: boolean; short?: string; type: 'boolean' | 'string' }> => {
  const config: Record<
    string,
    { multiple?: boolean; short?: string; type: 'boolean' | 'string' }
  > = {};

  for (const [name, def] of Object.entries(schema)) {
    const opt: { multiple?: boolean; short?: string; type: 'boolean' | 'string' } = {
      type: def.type === 'boolean' ? 'boolean' : 'string',
    };

    // First single-char alias becomes short option
    const shortAlias = def.aliases?.find((a) => a.length === 1);
    if (shortAlias) {
      opt.short = shortAlias;
    }

    // Arrays need multiple: true
    if (def.type === 'array') {
      opt.multiple = true;
    }

    config[name] = opt;
  }

  return config;
};

/**
 * Coerce parsed values to their expected types.
 */
const coerceValues = (
  values: Record<string, unknown>,
  schema: OptionsSchema,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};

  for (const [name, def] of Object.entries(schema)) {
    let value = values[name];

    // Apply default if undefined
    if (value === undefined && 'default' in def) {
      value = def.default;
    }

    // Type coercion
    if (value !== undefined) {
      switch (def.type) {
        case 'number':
          result[name] = typeof value === 'string' ? Number(value) : value;
          break;
        case 'array':
          if (def.items === 'number' && Array.isArray(value)) {
            result[name] = value.map((v) => (typeof v === 'string' ? Number(v) : v));
          } else {
            result[name] = value;
          }
          break;
        case 'count':
          // Count options count occurrences
          result[name] = typeof value === 'number' ? value : value ? 1 : 0;
          break;
        case 'enum':
          if (value !== undefined && !def.choices.includes(value as string)) {
            throw new Error(
              `Invalid value for --${name}: "${value}". Must be one of: ${def.choices.join(', ')}`,
            );
          }
          result[name] = value;
          break;
        default:
          result[name] = value;
      }
    } else {
      result[name] = value;
    }
  }

  return result;
};

/**
 * Coerce positional values.
 */
const coercePositionals = (
  positionals: string[],
  schema: PositionalsSchema,
): unknown[] => {
  const result: unknown[] = [];

  for (let i = 0; i < schema.length; i++) {
    const def = schema[i]!;
    const value = positionals[i];

    if (def.type === 'variadic') {
      // Rest of positionals - def is narrowed to VariadicPositional here
      const variadicDef = def as { items: 'string' | 'number' };
      const rest = positionals.slice(i);
      if (variadicDef.items === 'number') {
        result.push(rest.map(Number));
      } else {
        result.push(rest);
      }
      break;
    }

    if (value !== undefined) {
      if (def.type === 'number') {
        result.push(Number(value));
      } else {
        result.push(value);
      }
    } else if ('default' in def && def.default !== undefined) {
      result.push(def.default);
    } else if (def.required) {
      throw new Error(`Missing required positional argument at position ${i}`);
    } else {
      result.push(undefined);
    }
  }

  return result;
};

/**
 * Options for parseSimple.
 */
interface ParseSimpleOptions<
  TOptions extends OptionsSchema = OptionsSchema,
  TPositionals extends PositionalsSchema = PositionalsSchema,
> {
  options?: TOptions;
  positionals?: TPositionals;
  args?: string[];
}

/**
 * Parse arguments for a simple CLI (no commands).
 */
export const parseSimple = async <
  TOptions extends OptionsSchema = OptionsSchema,
  TPositionals extends PositionalsSchema = PositionalsSchema,
>(
  config: ParseSimpleOptions<TOptions, TPositionals>,
): Promise<
  BargsResult<InferOptions<TOptions>, InferPositionals<TPositionals>, undefined>
> => {
  const {
    options: optionsSchema = {} as TOptions,
    positionals: positionalsSchema = [] as unknown as TPositionals,
    args = process.argv.slice(2),
  } = config;

  // Build parseArgs config
  const parseArgsOptions = buildParseArgsConfig(optionsSchema);

  // Parse with Node.js util.parseArgs
  const { positionals, values } = parseArgs({
    args,
    options: parseArgsOptions,
    strict: true,
    allowPositionals: positionalsSchema.length > 0,
  });

  // Coerce and apply defaults
  const coercedValues = coerceValues(values, optionsSchema);
  const coercedPositionals = coercePositionals(positionals, positionalsSchema);

  return {
    command: undefined,
    positionals: coercedPositionals as InferPositionals<TPositionals>,
    values: coercedValues as InferOptions<TOptions>,
  };
};

/**
 * Parse arguments for a command-based CLI.
 */
export const parseCommands = async <
  TOptions extends OptionsSchema = OptionsSchema,
  TCommands extends Record<string, AnyCommandConfig> = Record<string, AnyCommandConfig>,
>(
  config: BargsConfigWithCommands<TOptions, PositionalsSchema, TCommands>,
): Promise<BargsResult<InferOptions<TOptions>, unknown[], string | undefined>> => {
  const {
    options: globalOptions = {} as TOptions,
    commands,
    defaultHandler,
    args = process.argv.slice(2),
  } = config;

  const commandsRecord = commands as Record<string, AnyCommandConfig>;

  // Find command name (first non-flag argument)
  const commandIndex = args.findIndex((arg) => !arg.startsWith('-'));
  const commandName = commandIndex >= 0 ? args[commandIndex] : undefined;
  const remainingArgs = commandName
    ? [...args.slice(0, commandIndex), ...args.slice(commandIndex + 1)]
    : args;

  // No command specified
  if (!commandName) {
    if (typeof defaultHandler === 'string') {
      // Use named default command
      return parseCommands({
        ...config,
        args: [defaultHandler, ...args],
        defaultHandler: undefined,
      });
    } else if (typeof defaultHandler === 'function') {
      // Parse global options and call default handler
      const parseArgsOptions = buildParseArgsConfig(globalOptions);
      const { values } = parseArgs({
        args: remainingArgs,
        options: parseArgsOptions,
        strict: true,
        allowPositionals: false,
      });
      const coercedValues = coerceValues(values, globalOptions);

      const result: BargsResult<InferOptions<TOptions>, unknown[], string | undefined> = {
        command: undefined,
        positionals: [],
        values: coercedValues as InferOptions<TOptions>,
      };

      await defaultHandler(result as BargsResult<InferOptions<TOptions>, [], undefined>);
      return result;
    } else {
      throw new HelpError('No command specified.');
    }
  }

  // Find command config
  const command = commandsRecord[commandName];
  if (!command) {
    throw new HelpError(`Unknown command: ${commandName}`);
  }

  // Merge global and command options
  const commandOptions = (command.options ?? {}) as OptionsSchema;
  const mergedOptionsSchema = { ...globalOptions, ...commandOptions };
  const commandPositionals = (command.positionals ?? []) as PositionalsSchema;

  // Build parseArgs config
  const parseArgsOptions = buildParseArgsConfig(mergedOptionsSchema);

  // Parse
  const { positionals, values } = parseArgs({
    args: remainingArgs,
    options: parseArgsOptions,
    strict: true,
    allowPositionals: commandPositionals.length > 0,
  });

  // Coerce
  const coercedValues = coerceValues(values, mergedOptionsSchema);
  const coercedPositionals = coercePositionals(positionals, commandPositionals);

  const result = {
    command: commandName,
    positionals: coercedPositionals,
    values: coercedValues,
  } as BargsResult<InferOptions<TOptions>, unknown[], string>;

  // Call handler
  await command.handler(result as Parameters<typeof command.handler>[0]);

  return result;
};

// Export types and helpers that will be needed by other modules
export { buildParseArgsConfig, coercePositionals, coerceValues };
export type { ParseSimpleOptions };
