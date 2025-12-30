/**
 * Low-level argument parsing logic wrapping Node.js `util.parseArgs()`.
 *
 * Handles the transformation of CLI arguments into typed values by:
 *
 * - Building `parseArgs` configuration from bargs option schemas
 * - Coercing parsed string values to their declared types (number, enum, etc.)
 * - Processing positional arguments including variadic rest args
 * - Running handler functions (sync or async) after successful parsing
 * - Supporting both simple CLIs and command-based CLIs with subcommand dispatch
 *
 * @packageDocumentation
 */

import { parseArgs } from 'node:util';

import type {
  BargsConfigWithCommands,
  BargsResult,
  CommandConfigInput,
  HandlerFn,
  InferOptions,
  InferPositionals,
  OptionsSchema,
  PositionalsSchema,
} from './types.js';

import { BargsError, HelpError } from './errors.js';

/**
 * Check if a value is a thenable (Promise-like). Uses duck-typing for
 * cross-realm compatibility.
 */
export const isThenable = (value: unknown): value is PromiseLike<unknown> =>
  value !== null &&
  typeof value === 'object' &&
  typeof (value as { then?: unknown }).then === 'function';

/**
 * Run a handler or array of handlers synchronously. Throws if any handler
 * returns a thenable.
 */
export const runSyncHandlers = <T>(
  handler: HandlerFn<T> | HandlerFn<T>[],
  result: T,
): void => {
  const handlers: HandlerFn<T>[] = Array.isArray(handler) ? handler : [handler];
  for (const h of handlers) {
    const maybePromise = h(result);
    if (isThenable(maybePromise)) {
      throw new BargsError(
        'Handler returned a thenable. Use bargsAsync() for async handlers.',
      );
    }
  }
};

/**
 * Run a handler or array of handlers sequentially (async).
 */
export const runHandlers = async <T>(
  handler: HandlerFn<T> | HandlerFn<T>[],
  result: T,
): Promise<void> => {
  const handlers: HandlerFn<T>[] = Array.isArray(handler) ? handler : [handler];
  for (const h of handlers) {
    await h(result);
  }
};

/**
 * Build parseArgs options config from our options schema.
 */
const buildParseArgsConfig = (
  schema: OptionsSchema,
): Record<
  string,
  { multiple?: boolean; short?: string; type: 'boolean' | 'string' }
> => {
  const config: Record<
    string,
    { multiple?: boolean; short?: string; type: 'boolean' | 'string' }
  > = {};

  for (const [name, def] of Object.entries(schema)) {
    const opt: {
      multiple?: boolean;
      short?: string;
      type: 'boolean' | 'string';
    } = {
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
        case 'array':
          if (def.items === 'number' && Array.isArray(value)) {
            result[name] = (value as (number | string)[]).map(
              (v: number | string) => (typeof v === 'string' ? Number(v) : v),
            );
          } else {
            result[name] = value;
          }
          break;
        case 'count':
          // Count options count occurrences
          result[name] = typeof value === 'number' ? value : value ? 1 : 0;
          break;
        case 'enum': {
          const enumValue = value as string;
          if (value !== undefined && !def.choices.includes(enumValue)) {
            throw new Error(
              `Invalid value for --${name}: "${enumValue}". Must be one of: ${def.choices.join(', ')}`,
            );
          }
          result[name] = value;
          break;
        }
        case 'number':
          result[name] = typeof value === 'string' ? Number(value) : value;
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
 *
 * Note: Schema validation (variadic last, required order) is done upfront by
 * validateConfig in bargs.ts.
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
      const variadicDef = def as { items: 'number' | 'string' };
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
      } else if (def.type === 'enum') {
        // Validate enum choice
        if (!def.choices.includes(value)) {
          throw new Error(
            `Invalid value for positional ${i}: "${value}". Must be one of: ${def.choices.join(', ')}`,
          );
        }
        result.push(value);
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
  args?: string[];
  options?: TOptions;
  positionals?: TPositionals;
}

/**
 * Parse arguments for a simple CLI (no commands). This is synchronous - it only
 * parses, does not run handlers.
 */
export const parseSimple = <
  TOptions extends OptionsSchema = OptionsSchema,
  TPositionals extends PositionalsSchema = PositionalsSchema,
>(
  config: ParseSimpleOptions<TOptions, TPositionals>,
): BargsResult<
  InferOptions<TOptions>,
  InferPositionals<TPositionals>,
  undefined
> => {
  const {
    args = process.argv.slice(2),
    options: optionsSchema = {} as TOptions,
    positionals: positionalsSchema = [] as unknown as TPositionals,
  } = config;

  // Build parseArgs config
  const parseArgsOptions = buildParseArgsConfig(optionsSchema);

  // Parse with Node.js util.parseArgs
  const { positionals, values } = parseArgs({
    allowPositionals: positionalsSchema.length > 0,
    args,
    options: parseArgsOptions,
    strict: true,
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
 * Result from parseCommandsCore including the handler to run.
 */
interface ParseCommandsCoreResult<TOptions extends OptionsSchema> {
  handler: HandlerFn<unknown> | HandlerFn<unknown>[] | undefined;
  result: BargsResult<InferOptions<TOptions>, unknown[], string | undefined>;
}

/**
 * Core command parsing logic (sync, no handler execution). Returns the parsed
 * result and the handler to run.
 */
const parseCommandsCore = <
  TOptions extends OptionsSchema = OptionsSchema,
  TCommands extends Record<string, CommandConfigInput> = Record<
    string,
    CommandConfigInput
  >,
>(
  config: BargsConfigWithCommands<TOptions, TCommands>,
): ParseCommandsCoreResult<TOptions> => {
  const {
    args = process.argv.slice(2),
    commands,
    defaultHandler,
    options: globalOptions = {} as TOptions,
  } = config;

  const commandsRecord = commands as Record<string, CommandConfigInput>;

  // Find command name (first non-flag argument)
  const commandIndex = args.findIndex((arg) => !arg.startsWith('-'));
  const commandName = commandIndex >= 0 ? args[commandIndex] : undefined;
  const remainingArgs = commandName
    ? [...args.slice(0, commandIndex), ...args.slice(commandIndex + 1)]
    : args;

  // No command specified
  if (!commandName) {
    if (typeof defaultHandler === 'string') {
      // Use named default command (recursive)
      return parseCommandsCore({
        ...config,
        args: [defaultHandler, ...args],
        defaultHandler: undefined,
      });
    } else if (
      typeof defaultHandler === 'function' ||
      Array.isArray(defaultHandler)
    ) {
      // Parse global options only
      const parseArgsOptions = buildParseArgsConfig(globalOptions);
      const { values } = parseArgs({
        allowPositionals: false,
        args: remainingArgs,
        options: parseArgsOptions,
        strict: true,
      });
      const coercedValues = coerceValues(values, globalOptions);

      const result: BargsResult<
        InferOptions<TOptions>,
        unknown[],
        string | undefined
      > = {
        command: undefined,
        positionals: [],
        values: coercedValues as InferOptions<TOptions>,
      };

      return {
        handler: defaultHandler as HandlerFn<unknown> | HandlerFn<unknown>[],
        result,
      };
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
  const commandOptions = command.options ?? {};
  const mergedOptionsSchema = { ...globalOptions, ...commandOptions };
  const commandPositionals = command.positionals ?? [];

  // Build parseArgs config
  const parseArgsOptions = buildParseArgsConfig(mergedOptionsSchema);

  // Parse
  const { positionals, values } = parseArgs({
    allowPositionals: commandPositionals.length > 0,
    args: remainingArgs,
    options: parseArgsOptions,
    strict: true,
  });

  // Coerce
  const coercedValues = coerceValues(values, mergedOptionsSchema);
  const coercedPositionals = coercePositionals(positionals, commandPositionals);

  const result = {
    command: commandName,
    positionals: coercedPositionals,
    values: coercedValues,
  } as BargsResult<InferOptions<TOptions>, unknown[], string>;

  return { handler: command.handler, result };
};

/**
 * Parse arguments for a command-based CLI (sync). Throws if any handler returns
 * a thenable.
 */
export const parseCommandsSync = <
  TOptions extends OptionsSchema = OptionsSchema,
  TCommands extends Record<string, CommandConfigInput> = Record<
    string,
    CommandConfigInput
  >,
>(
  config: BargsConfigWithCommands<TOptions, TCommands>,
): BargsResult<InferOptions<TOptions>, unknown[], string | undefined> => {
  const { handler, result } = parseCommandsCore(config);

  if (handler) {
    runSyncHandlers(handler, result);
  }

  return result;
};

/**
 * Parse arguments for a command-based CLI (async).
 */
export const parseCommandsAsync = async <
  TOptions extends OptionsSchema = OptionsSchema,
  TCommands extends Record<string, CommandConfigInput> = Record<
    string,
    CommandConfigInput
  >,
>(
  config: BargsConfigWithCommands<TOptions, TCommands>,
): Promise<
  BargsResult<InferOptions<TOptions>, unknown[], string | undefined>
> => {
  const { handler, result } = parseCommandsCore(config);

  if (handler) {
    await runHandlers(handler, result);
  }

  return result;
};

/**
 * Parse arguments for a command-based CLI.
 *
 * @deprecated Use parseCommandsSync or parseCommandsAsync instead.
 */
export const parseCommands = parseCommandsAsync;
