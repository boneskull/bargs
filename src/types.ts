import type { z, ZodArray, ZodRawShape, ZodTuple, ZodType } from 'zod';

/**
 * Aliases map canonical option names to arrays of alias strings. Used
 * internally with unwrapped ZodRawShape.
 *
 * @example {verbose: ['v'], config: ['c', 'config-file']}
 */
export type Aliases<T extends ZodRawShape> = {
  [K in keyof T]?: string[];
};

/**
 * Any command configuration. Used internally where specific type inference
 * isn't needed.
 */
export type AnyCommandConfig = CommandConfig<
  ZodType,
  undefined | ZodArray | ZodTuple
>;

/**
 * CLI configuration.
 *
 * TOptions accepts ZodType to support schemas with .transform(). At runtime, we
 * unwrap to the inner ZodObject for parseArgs config extraction.
 */
export interface BargsConfig<
  TOptions extends ZodType = ZodType,
  TPositionals extends undefined | ZodArray | ZodTuple = undefined,
  TCommands extends Record<string, AnyCommandConfig> | undefined = undefined,
> {
  /**
   * Aliases for options. Maps canonical option names to arrays of alias
   * strings. Single-character aliases become short flags (e.g., `-v`).
   */
  aliases?: SchemaAliases<TOptions>;

  /**
   * CLI arguments to parse. Defaults to `process.argv.slice(2)`.
   */
  args?: string[];

  /**
   * Map of command names to their configurations.
   */
  commands?: TCommands;

  /**
   * Pre-populated option values (e.g., from a config file). These have lower
   * priority than CLI arguments but higher priority than schema defaults.
   *
   * Precedence: CLI args > config values > schema defaults
   */
  config?: Partial<z.infer<TOptions>>;

  /**
   * CLI description displayed in help text.
   */
  description?: string;

  /**
   * Function invoked after parsing. Receives the parsed result. Return value is
   * ignored; bargs() always returns the parsed result.
   */
  handler?: Handler<
    BargsResult<z.infer<TOptions>, InferredPositionals<TPositionals>, undefined>
  >;

  /**
   * CLI name displayed in help text and error messages.
   */
  name: string;

  /**
   * Zod schema for CLI options. Supports `.transform()` for post-parse
   * processing and `.default()` for fallback values.
   */
  options?: TOptions;

  /**
   * Zod schema for positional arguments. Use `z.tuple()` for fixed positionals
   * or `z.array()` for variadic. Validated after options parsing.
   */
  positionals?: TPositionals;

  /**
   * Version string displayed in help text (e.g., "1.0.0").
   */
  version?: string;
}

/**
 * CLI config with commands. Requires commands and allows defaultHandler.
 *
 * When commands are present, `options` and `aliases` from BargsConfig serve as
 * global options shared across all commands.
 */
export type BargsConfigWithCommands<
  TOptions extends ZodType = ZodType,
  TPositionals extends undefined | ZodArray | ZodTuple = undefined,
  TCommands extends Record<string, AnyCommandConfig> = Record<
    string,
    AnyCommandConfig
  >,
> = Omit<BargsConfig<TOptions, TPositionals, TCommands>, 'handler'> & {
  commands: TCommands;

  /**
   * Default handler when no command is specified. Can be a command name
   * (string) or a function that receives global options only.
   */
  defaultHandler?:
    | Handler<BargsResult<z.infer<TOptions>, [], undefined>>
    | keyof TCommands;
};

/**
 * Result from parsing CLI arguments. Always contains all three properties.
 *
 * @remarks
 * TValues is intentionally unconstrained to support ZodType inference. At
 * runtime, options schemas are always object-like (ZodObject or ZodPipe
 * wrapping one).
 */
export interface BargsResult<
  TValues = Record<string, unknown>,
  TPositionals extends readonly unknown[] = [],
  TCommand extends string | undefined = string | undefined,
> {
  /**
   * The command that was invoked, or `undefined` for simple CLIs.
   */
  command: TCommand;

  /**
   * Validated positional arguments, or empty array if none expected.
   */
  positionals: TPositionals;

  /**
   * Validated option values (after Zod parsing and transforms).
   */
  values: TValues;
}

/**
 * Command definition.
 *
 * TOptions accepts ZodType to support schemas with .transform(). TPositionals
 * accepts ZodType for positional argument validation.
 *
 * @remarks
 * No default type parameters - this enables TypeScript to infer the handler's
 * result type from the options schema in the same object.
 */
export interface CommandConfig<
  TOptions extends ZodType,
  TPositionals extends undefined | ZodArray | ZodTuple,
> {
  /**
   * Aliases for command-specific options. Maps canonical option names to arrays
   * of alias strings. Single-character aliases become short flags (e.g.,
   * `-f`).
   */
  aliases?: SchemaAliases<TOptions>;

  /**
   * Command description displayed in help text.
   */
  description: string;

  /**
   * Function invoked when this command is executed. Receives the parsed result.
   * Return value is ignored; bargs() always returns the parsed result.
   */
  handler: Handler<
    BargsResult<z.infer<TOptions>, InferredPositionals<TPositionals>, string>
  >;

  /**
   * Zod schema for command-specific options. Merged with global options at
   * parse time. Supports `.transform()` for post-parse processing.
   */
  options?: TOptions;

  /**
   * Zod schema for positional arguments. Use `z.tuple()` for fixed positionals
   * or `z.array()` for variadic. Validated after options parsing.
   */
  positionals?: TPositionals;
}

/**
 * Handler function signature. Receives parsed result and can perform side
 * effects. Return value is ignored; bargs() always returns the parsed result.
 */
export type Handler<TResult> = (result: TResult) => Promise<void> | void;

/**
 * Inferred positionals type. Resolves to the inferred array type or empty tuple.
 */
export type InferredPositionals<T> = T extends ZodArray | ZodTuple
  ? z.infer<T>
  : [];

/**
 * Aliases for a Zod schema, keyed by the schema's input property names.
 * Supports schemas with `.transform()` by using `z.input<T>`.
 *
 * @example {verbose: ['v'], config: ['c', 'config-file']}
 */
export type SchemaAliases<T extends ZodType> = {
  [K in keyof z.input<T>]?: string[];
};
