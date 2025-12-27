import { parseArgs } from 'node:util';
import {
  z,
  type ZodArray,
  type ZodObject,
  type ZodRawShape,
  type ZodTuple,
  type ZodType,
} from 'zod';

import type {
  Aliases,
  AnyCommandConfig,
  BargsConfigWithCommands,
  BargsResult,
  InferredPositionals,
} from './types.js';

import { extractParseArgsConfig } from './schema.js';
import {
  getArrayElement,
  getDefType,
  getInnerObject as getInnerObjectUtil,
  unwrapToBase,
} from './zod-introspection.js';

/**
 * Options for parseSimple (internal).
 */
interface ParseSimpleOptions<
  TOptions extends ZodType = ZodType,
  TPositionals extends undefined | ZodArray | ZodTuple = undefined,
> {
  aliases?: { [K in keyof z.input<TOptions>]?: string[] };
  args?: string[];
  config?: Partial<z.infer<TOptions>>;
  options?: TOptions;
  positionals?: TPositionals;
}

/**
 * Get the inner ZodObject from a schema (unwrapping pipes/transforms).
 */
const getInnerObject = (schema: ZodType): ZodObject<ZodRawShape> => {
  const inner = getInnerObjectUtil(schema);
  return (inner ?? schema) as ZodObject<ZodRawShape>;
};

/**
 * Coerce string values to their expected types based on schema.
 */
const coerceValues = <TOptions extends ZodObject<ZodRawShape>>(
  values: Record<string, unknown>,
  schema: TOptions,
): Record<string, unknown> => {
  const shape = schema.shape;
  const result: Record<string, unknown> = { ...values };

  for (const [key, value] of Object.entries(values)) {
    const fieldSchema = shape[key] as undefined | ZodType;
    if (!fieldSchema) {
      continue;
    }

    const base = unwrapToBase(fieldSchema);
    const schemaType = getDefType(base);

    // Coerce numbers
    if (schemaType === 'number' && typeof value === 'string') {
      result[key] = Number(value);
    }

    // Handle arrays of numbers
    if (schemaType === 'array') {
      const element = getArrayElement(base);
      if (getDefType(element) === 'number' && Array.isArray(value)) {
        result[key] = (value as unknown[]).map((v) =>
          typeof v === 'string' ? Number(v) : v,
        );
      }
    }
  }

  return result;
};

/**
 * Parse arguments for a simple CLI (no commands).
 */
export const parseSimple = async <
  TOptions extends ZodType = ZodType,
  TPositionals extends undefined | ZodArray | ZodTuple = undefined,
>(
  options: ParseSimpleOptions<TOptions, TPositionals>,
): Promise<
  BargsResult<z.infer<TOptions>, InferredPositionals<TPositionals>, undefined>
> => {
  const {
    aliases = {},
    args = process.argv.slice(2),
    config: defaults = {},
    options: schema = z.never(),
    positionals: positionalsSchema,
  } = options;

  // Get inner object schema for parseArgs config
  const innerSchema = getInnerObject(schema);
  const parseArgsOptions = extractParseArgsConfig(
    innerSchema,
    aliases as Aliases<ZodRawShape>,
  );

  // Call util.parseArgs
  const { positionals, values } = parseArgs({
    allowPositionals: positionalsSchema !== undefined,
    args,
    options: parseArgsOptions,
    strict: true,
  });

  // Merge: defaults -> parseArgs values (CLI wins)
  const merged = { ...defaults, ...values };

  // Coerce string values to expected types
  const coerced = coerceValues(merged, innerSchema);

  // Validate with Zod (including transforms)
  const validatedValues = await schema.parseAsync(coerced);

  // Validate positionals if schema provided, otherwise empty array
  const validatedPositionals = positionalsSchema
    ? await positionalsSchema.parseAsync(positionals)
    : [];

  return {
    command: undefined,
    positionals: validatedPositionals,
    values: validatedValues,
  } as BargsResult<z.infer<TOptions>, InferredPositionals<TPositionals>, undefined>;
};

/**
 * Parse arguments for a command-based CLI. Returns a BargsResult with command
 * name, values, and positionals.
 */
export const parseCommands = async <
  TOptions extends ZodType = ZodType,
  TCommands extends Record<string, AnyCommandConfig> = Record<
    string,
    AnyCommandConfig
  >,
>(
  config: BargsConfigWithCommands<TOptions, undefined, TCommands>,
): Promise<BargsResult<z.infer<TOptions>, [], string | undefined>> => {
  const {
    aliases = {},
    args = process.argv.slice(2),
    commands,
    defaultHandler,
    name,
    options: globalOptions,
  } = config;

  // Commands are required in BargsConfigWithCommands, so this is safe
  // Cast needed: TCommands generic can't be string-indexed even though it extends Record<string, ...>
  const commandsRecord = commands as Record<string, AnyCommandConfig>;

  // Extract command name (first non-flag argument)
  const commandIndex = args.findIndex((arg) => !arg.startsWith('-'));
  const commandName = commandIndex >= 0 ? args[commandIndex] : undefined;
  const remainingArgs = commandName
    ? [...args.slice(0, commandIndex), ...args.slice(commandIndex + 1)]
    : args;

  // If no command, use defaultHandler
  if (!commandName) {
    if (typeof defaultHandler === 'string') {
      // Run the default command by name
      const defaultCommand = commandsRecord[defaultHandler];
      if (!defaultCommand) {
        throw new Error(
          `Default command '${String(defaultHandler)}' not found`,
        );
      }
      // Recursively call with the default command injected
      return parseCommands({
        ...config,
        args: [String(defaultHandler), ...args],
        defaultHandler: undefined,
      });
    } else if (typeof defaultHandler === 'function') {
      // Run the default handler function with global options only
      const globalSchema = globalOptions ?? z.object({});
      const innerGlobal = getInnerObject(globalSchema);
      const parseArgsOptions = extractParseArgsConfig(
        innerGlobal,
        aliases as Aliases<ZodRawShape>,
      );
      const { values } = parseArgs({
        allowPositionals: false,
        args: remainingArgs,
        options: parseArgsOptions,
        strict: true,
      });
      const coerced = coerceValues(values, innerGlobal);
      const validatedValues = await globalSchema.parseAsync(coerced);
      const result = {
        command: undefined,
        positionals: [] as const,
        values: validatedValues,
      } as BargsResult<z.infer<TOptions>, [], undefined>;
      await defaultHandler(result);
      return result;
    } else {
      throw new Error(`No command specified. Run '${name} --help' for usage.`);
    }
  }

  // Get command config
  const command = commandsRecord[commandName];
  if (!command) {
    throw new Error(
      `Unknown command: ${commandName}. Run '${name} --help' for usage.`,
    );
  }

  // Build merged schema: global + command options
  const globalSchema = globalOptions ?? z.object({});
  const innerGlobal = getInnerObject(globalSchema);
  const commandSchema = command.options ?? z.object({});
  const innerCommand = getInnerObject(commandSchema);

  // Build parseArgs config from both schemas
  const globalConfig = extractParseArgsConfig(
    innerGlobal,
    aliases as Aliases<ZodRawShape>,
  );
  const commandConfig = extractParseArgsConfig(
    innerCommand,
    (command.aliases ?? {}) as Aliases<ZodRawShape>,
  );
  const mergedConfig = { ...globalConfig, ...commandConfig };

  // Parse
  const { positionals, values } = parseArgs({
    allowPositionals: command.positionals !== undefined,
    args: remainingArgs,
    options: mergedConfig,
    strict: true,
  });

  // Coerce and merge
  const coercedGlobal = coerceValues(values, innerGlobal);
  const coercedCommand = coerceValues(values, innerCommand);

  // Validate both schemas
  const validatedGlobal = (await globalSchema.parseAsync(
    coercedGlobal,
  )) as Record<string, unknown>;
  const validatedCommand = (await commandSchema.parseAsync(
    coercedCommand,
  )) as Record<string, unknown>;
  const validatedValues = {
    ...validatedGlobal,
    ...validatedCommand,
  };

  // Validate positionals if schema provided, otherwise empty array
  const positionalsSchema = command.positionals as undefined | ZodType;
  const validatedPositionals = positionalsSchema
    ? await positionalsSchema.parseAsync(positionals)
    : [];

  const result = {
    command: commandName,
    positionals: validatedPositionals,
    values: validatedValues,
  } as BargsResult<z.infer<TOptions>, [], string>;

  // Run command handler
  await command.handler(
    result as BargsResult<Record<string, unknown>, unknown[], string>,
  );

  return result;
};
