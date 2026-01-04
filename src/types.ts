/**
 * TypeScript type definitions for the bargs CLI argument parser.
 *
 * Defines all public interfaces and types including:
 *
 * - Option definitions (`StringOption`, `BooleanOption`, `EnumOption`, etc.)
 * - Positional definitions (`StringPositional`, `VariadicPositional`, etc.)
 * - Schema types (`OptionsSchema`, `PositionalsSchema`)
 * - Configuration types (`BargsConfig`, `BargsConfigWithCommands`)
 * - Command types (`CommandConfig`, `CommandConfigInput`)
 * - Type inference utilities (`InferOptions`, `InferPositionals`)
 * - Result types (`BargsResult`)
 *
 * @packageDocumentation
 */

import type { ThemeInput } from './theme.js';

/**
 * Type-erased command config for use in collections and constraints.
 *
 * WARNING: The handler uses `any` which will leak into inline command handlers.
 * For proper type inference in command handlers, use one of these patterns:
 *
 * 1. Use `bargs.command<typeof globalOptions>()({...})` to define commands
 * 2. Define commands in a separate variable with explicit types
 * 3. Add explicit type annotations to handler parameters
 *
 * @example // Option 1: Use bargs.command() (recommended) const myCmd =
 * bargs.command<typeof globalOpts>()({ handler: ({ values }) => { ... } //
 * values is properly typed });
 *
 * // Option 2: Explicit parameter types handler: ({ values }: BargsResult<...>)
 * => { ... }
 */
export interface AnyCommandConfig {
  description: string;
  handler: (result: any) => Promise<void> | void;
  options?: OptionsSchema;
  positionals?: PositionalsSchema;
  transforms?: TransformsConfig<any, any, any, any>;
}

/**
 * Array option definition (--flag value --flag value2).
 */
export interface ArrayOption extends OptionBase {
  default?: number[] | string[];
  /** Element type of the array */
  items: 'number' | 'string';
  type: 'array';
}

/**
 * Main bargs configuration.
 *
 * @typeParam TOptions - Options schema type
 * @typeParam TPositionals - Positionals schema type
 * @typeParam TCommands - Commands record type (undefined for simple CLIs)
 * @typeParam TTransforms - Transforms config type (affects handler input types)
 */
export interface BargsConfig<
  TOptions extends OptionsSchema = OptionsSchema,
  TPositionals extends PositionalsSchema = PositionalsSchema,
  TCommands extends Record<string, AnyCommandConfig> | undefined = undefined,
  TTransforms extends TransformsConfig<any, any, any, any> | undefined =
    undefined,
> {
  args?: string[];
  commands?: TCommands;
  description?: string;
  /**
   * Epilog text shown after help output. By default, shows homepage and
   * repository URLs from package.json if available. Set to `false` or empty
   * string to disable.
   */
  epilog?: false | string;
  /**
   * Handler receives the final transformed values and positionals. When
   * transforms are defined, types flow through the transform pipeline. Handler
   * arrays are no longer supported - use a single handler function.
   */
  handler?: Handler<
    BargsResult<
      InferTransformedValues<InferOptions<TOptions>, TTransforms>,
      InferTransformedPositionals<InferPositionals<TPositionals>, TTransforms>,
      undefined
    >
  >;
  name: string;
  options?: TOptions;
  positionals?: TPositionals;
  /**
   * Transform functions that modify parsed values before handler execution.
   * Values transform receives InferOptions<TOptions>, positionals transform
   * receives InferPositionals<TPositionals>.
   */
  transforms?: 0 extends 1 & TTransforms // Check if TTransforms is `any`
    ? TransformsConfig<any, any, any, any> // If any, accept any transforms
    : [TTransforms] extends [undefined]
      ? TransformsInput<InferOptions<TOptions>, InferPositionals<TPositionals>>
      : TTransforms;
  version?: string;
}

export type BargsConfigWithCommands<
  TOptions extends OptionsSchema = OptionsSchema,
  TCommands extends Record<string, AnyCommandConfig> = Record<
    string,
    AnyCommandConfig
  >,
  TTransforms extends TransformsConfig<any, any, any, any> | undefined =
    undefined,
> = Omit<
  BargsConfig<TOptions, PositionalsSchema, TCommands, TTransforms>,
  'commands' | 'handler' | 'positionals'
> & {
  commands: CommandsInput<TOptions, TTransforms, TCommands>;
  defaultHandler?:
    | CommandNames<TCommands>
    | Handler<
        BargsResult<
          InferTransformedValues<InferOptions<TOptions>, TTransforms>,
          readonly [],
          undefined
        >
      >;
};

/**
 * Internal type for command-based config (used by parser). Uses raw TCommands
 * without InferredCommands transformation.
 *
 * @internal
 */
export type BargsConfigWithCommandsInternal<
  TOptions extends OptionsSchema = OptionsSchema,
  TCommands extends Record<string, AnyCommandConfig> = Record<
    string,
    AnyCommandConfig
  >,
  TTransforms extends TransformsConfig<any, any, any, any> | undefined =
    undefined,
> = Omit<
  BargsConfig<TOptions, PositionalsSchema, TCommands, TTransforms>,
  'handler' | 'positionals'
> & {
  commands: TCommands;
  defaultHandler?:
    | Handler<
        BargsResult<
          InferTransformedValues<InferOptions<TOptions>, TTransforms>,
          readonly [],
          undefined
        >
      >
    | keyof TCommands;
};

/**
 * Runtime options for bargs (separate from parsing config).
 */
export interface BargsOptions {
  /** Color theme for help output */
  theme?: ThemeInput;
}

/**
 * Result from parsing CLI arguments.
 */
export interface BargsResult<
  TValues = Record<string, unknown>,
  TPositionals extends readonly unknown[] = [],
  TCommand extends string | undefined = string | undefined,
> {
  command: TCommand;
  positionals: TPositionals;
  values: TValues;
}

/**
 * Boolean option definition.
 */
export interface BooleanOption extends OptionBase {
  default?: boolean;
  type: 'boolean';
}

/**
 * Command configuration.
 *
 * The handler receives typed global options merged with command-specific
 * options, properly transformed. Use `bargs.command<TGlobalOptions>()` to pass
 * global options type for full type inference.
 *
 * @typeParam TGlobalOptions - Global options schema (from parent config)
 * @typeParam TOptions - Command-specific options schema
 * @typeParam TPositionals - Command positionals schema
 * @typeParam TTransforms - Command-level transforms config
 */
export interface CommandConfig<
  TGlobalOptions extends OptionsSchema = OptionsSchema,
  TOptions extends OptionsSchema = OptionsSchema,
  TPositionals extends PositionalsSchema = PositionalsSchema,
  TTransforms extends TransformsConfig<any, any, any, any> | undefined =
    undefined,
> {
  description: string;
  handler: Handler<
    BargsResult<
      InferTransformedValues<
        InferOptions<TGlobalOptions> & InferOptions<TOptions>,
        TTransforms
      >,
      InferTransformedPositionals<InferPositionals<TPositionals>, TTransforms>,
      string
    >
  >;
  options?: TOptions;
  positionals?: TPositionals;
  /** Command-level transforms run after top-level transforms */
  transforms?: TTransforms;
}

/**
 * Command config input type for inline command definitions. Uses `any` for
 * handler result to accept any handler signature. See AnyCommandConfig for
 * workarounds to get proper type inference.
 */
export interface CommandConfigInput {
  description: string;
  handler: (result: any) => Promise<void> | void;
  options?: OptionsSchema;
  positionals?: PositionalsSchema;
  transforms?: TransformsConfig<any, any, any, any>;
}

/**
 * Count option definition (--verbose --verbose = 2).
 */
export interface CountOption extends OptionBase {
  default?: number;
  type: 'count';
}

/**
 * Enum option definition with string choices.
 */
export interface EnumOption<T extends string = string> extends OptionBase {
  choices: readonly T[];
  default?: T;
  type: 'enum';
}

/**
 * Enum positional definition with string choices.
 */
export interface EnumPositional<
  T extends string = string,
> extends PositionalBase {
  choices: readonly T[];
  default?: T;
  type: 'enum';
}

/**
 * Handler function signature. Handler arrays are no longer supported - use
 * transforms for middleware-like sequential processing instead.
 */
export type Handler<TResult> = HandlerFn<TResult>;

/**
 * Single handler function signature.
 */
export type HandlerFn<TResult> = (result: TResult) => Promise<void> | void;

/**
 * Compute the handler result type for a single command. Separating this makes
 * the type easier for TypeScript to evaluate.
 */
export type InferCommandResult<
  TGlobalOptions extends OptionsSchema,
  TGlobalTransforms extends TransformsConfig<any, any, any, any> | undefined,
  TCommandOptions extends OptionsSchema | undefined,
  TCommandPositionals extends PositionalsSchema | undefined,
  TCommandTransforms extends TransformsConfig<any, any, any, any> | undefined,
> = BargsResult<
  InferTransformedValues<
    InferTransformedValues<
      InferOptions<TGlobalOptions> &
        (TCommandOptions extends OptionsSchema
          ? InferOptions<TCommandOptions>
          : Record<string, never>),
      TGlobalTransforms
    >,
    TCommandTransforms
  >,
  InferTransformedPositionals<
    TCommandPositionals extends PositionalsSchema
      ? InferPositionals<TCommandPositionals>
      : readonly [],
    TCommandTransforms
  >,
  string
>;

/**
 * Infer the TypeScript type from an option definition.
 */
export type InferOption<T extends OptionDef> = T extends BooleanOption
  ? T['required'] extends true
    ? boolean
    : T['default'] extends boolean
      ? boolean
      : boolean | undefined
  : T extends NumberOption
    ? T['required'] extends true
      ? number
      : T['default'] extends number
        ? number
        : number | undefined
    : T extends StringOption
      ? T['required'] extends true
        ? string
        : T['default'] extends string
          ? string
          : string | undefined
      : T extends EnumOption<infer E>
        ? T['required'] extends true
          ? E
          : T['default'] extends E
            ? E
            : E | undefined
        : T extends ArrayOption
          ? T['items'] extends 'number'
            ? number[]
            : string[]
          : T extends CountOption
            ? number
            : never;

/**
 * Infer values type from an options schema.
 */
export type InferOptions<T extends OptionsSchema> = {
  [K in keyof T]: InferOption<T[K]>;
};

/**
 * Infer a single positional's type.
 */
export type InferPositional<T extends PositionalDef> =
  T extends NumberPositional
    ? T['required'] extends true
      ? number
      : T['default'] extends number
        ? number
        : number | undefined
    : T extends StringPositional
      ? T['required'] extends true
        ? string
        : T['default'] extends string
          ? string
          : string | undefined
      : T extends EnumPositional<infer E>
        ? T['required'] extends true
          ? E
          : T['default'] extends E
            ? E
            : E | undefined
        : T extends VariadicPositional
          ? T['items'] extends 'number'
            ? number[]
            : string[]
          : never;

/**
 * Recursively build a tuple type from a positionals schema array. Preserves
 * tuple structure (order and length) rather than producing a mapped object
 * type.
 */
export type InferPositionals<T extends PositionalsSchema> = T extends readonly [
  infer First,
  ...infer Rest,
]
  ? First extends PositionalDef
    ? Rest extends PositionalsSchema
      ? readonly [InferPositional<First>, ...InferPositionals<Rest>]
      : readonly [InferPositional<First>]
    : readonly []
  : T extends readonly [infer Only]
    ? Only extends PositionalDef
      ? readonly [InferPositional<Only>]
      : readonly []
    : readonly [];

/**
 * Compute proper handler types for each command in a commands record.
 *
 * This mapped type enables type inference for inline command definitions by
 * computing the handler signature from each command's options, positionals, and
 * transforms - plus the global options and transforms from the parent config.
 *
 * The handler receives:
 *
 * - Values: global options + command options, transformed by global then command
 *   transforms
 * - Positionals: command positionals, transformed by command transforms
 * - Command: the command name (string)
 *
 * Commands defined with `opt.command()` (returning `CommandConfig`) are passed
 * through unchanged to preserve their existing handler types. Only inline
 * command definitions get the computed handler type.
 *
 * @typeParam TGlobalOptions - Top-level options schema
 * @typeParam TGlobalTransforms - Top-level transforms config
 * @typeParam TCommands - Record of command configurations
 */
export type InferredCommands<
  TGlobalOptions extends OptionsSchema,
  TGlobalTransforms extends TransformsConfig<any, any, any, any> | undefined,
  TCommands extends Record<string, AnyCommandConfig>,
> = {
  [K in keyof TCommands]: TCommands[K] extends CommandConfig<
    infer _TGlobalOpts,
    infer _TOpts,
    infer _TPos,
    infer _TTrans
  >
    ? // Command created via opt.command() - preserve its existing type
      TCommands[K]
    : // Inline command - compute handler type from schema
      {
        description: TCommands[K]['description'];
        handler: Handler<
          InferCommandResult<
            TGlobalOptions,
            TGlobalTransforms,
            TCommands[K]['options'],
            TCommands[K]['positionals'],
            TCommands[K]['transforms']
          >
        >;
        options?: TCommands[K]['options'];
        positionals?: TCommands[K]['positionals'];
        transforms?: TCommands[K]['transforms'];
      };
};

/**
 * Infer the output positionals type from a transforms config. If no positionals
 * transform, output equals input.
 */
export type InferTransformedPositionals<
  TPositionalsIn extends readonly unknown[],
  TTransforms,
> = TTransforms extends { positionals: PositionalsTransformFn<any, infer TOut> }
  ? TOut extends readonly unknown[]
    ? TOut
    : TPositionalsIn
  : TPositionalsIn;

/**
 * Infer the output values type from a transforms config. If no values
 * transform, output equals input.
 */
export type InferTransformedValues<TValuesIn, TTransforms> =
  TTransforms extends { values: ValuesTransformFn<any, infer TOut> }
    ? TOut
    : TValuesIn;

/**
 * Number option definition.
 */
export interface NumberOption extends OptionBase {
  default?: number;
  type: 'number';
}

/**
 * Number positional.
 */
export interface NumberPositional extends PositionalBase {
  default?: number;
  type: 'number';
}

/**
 * Union of all option definitions.
 */
export type OptionDef =
  | ArrayOption
  | BooleanOption
  | CountOption
  | EnumOption<string>
  | NumberOption
  | StringOption;

/**
 * Options schema: a record of option names to their definitions.
 */
export type OptionsSchema = Record<string, OptionDef>;

/**
 * Union of positional definitions.
 */
export type PositionalDef =
  | EnumPositional<string>
  | NumberPositional
  | StringPositional
  | VariadicPositional;

/**
 * Positionals can be a tuple (ordered) or a single variadic.
 */
export type PositionalsSchema = readonly PositionalDef[];

/**
 * Positionals transform function. Receives parsed positionals tuple, returns
 * transformed positionals tuple. The return type becomes the new positionals
 * type for the handler.
 */
export type PositionalsTransformFn<
  TIn extends readonly unknown[],
  TOut extends readonly unknown[],
> = (positionals: TIn) => Promise<TOut> | TOut;

/**
 * String option definition.
 */
export interface StringOption extends OptionBase {
  default?: string;
  type: 'string';
}

/**
 * String positional.
 */
export interface StringPositional extends PositionalBase {
  default?: string;
  type: 'string';
}

/**
 * Transforms configuration for modifying parsed results before handler
 * execution. Each transform is optional and can be sync or async.
 */
export interface TransformsConfig<
  TValuesIn,
  TValuesOut,
  TPositionalsIn extends readonly unknown[],
  TPositionalsOut extends readonly unknown[],
> {
  /** Transform parsed positionals tuple */
  positionals?: PositionalsTransformFn<TPositionalsIn, TPositionalsOut>;
  /** Transform parsed option values */
  values?: ValuesTransformFn<TValuesIn, TValuesOut>;
}

/**
 * Values transform function. Receives parsed values, returns transformed
 * values. The return type becomes the new values type for the handler.
 */
export type ValuesTransformFn<TIn, TOut> = (
  values: TIn,
) => Promise<TOut> | TOut;

/**
 * Variadic positional (rest args).
 */
export interface VariadicPositional extends PositionalBase {
  items: 'number' | 'string';
  type: 'variadic';
}

/**
 * Command input type that computes the proper handler signature from the
 * command's own options/positionals schemas. This provides contextual typing
 * for inline command handlers.
 *
 * @typeParam TGlobalOptions - Global options schema from parent config
 * @typeParam TGlobalTransforms - Global transforms from parent config
 * @typeParam TOptions - Command's own options schema
 * @typeParam TPositionals - Command's own positionals schema
 * @typeParam TTransforms - Command's own transforms
 */
interface CommandInput<
  TGlobalOptions extends OptionsSchema,
  TGlobalTransforms extends TransformsConfig<any, any, any, any> | undefined,
  TOptions extends OptionsSchema = Record<string, never>,
  TPositionals extends PositionalsSchema = [],
  TTransforms extends TransformsConfig<any, any, any, any> | undefined =
    undefined,
> {
  description: string;
  handler: Handler<
    InferCommandResult<
      TGlobalOptions,
      TGlobalTransforms,
      TOptions,
      TPositionals,
      TTransforms
    >
  >;
  options?: TOptions;
  positionals?: TPositionals;
  transforms?: TTransforms;
}

/**
 * Helper type to extract command names from a commands record for
 * defaultHandler typing.
 */
type CommandNames<T> = T extends Record<infer K, AnyCommandConfig> ? K : never;

/**
 * Bargs config with commands (requires commands, allows defaultHandler).
 *
 * Commands can be defined in two ways:
 *
 * 1. Using opt.command() - handler receives local options only (legacy)
 * 2. Inline definition - handler receives both global and local options
 *
 * Note: Top-level `positionals` is not allowed for command-based CLIs. Each
 * command defines its own positionals.
 *
 * The `commands` property uses `InferredCommands` to compute proper handler
 * types for inline command definitions. Each command's handler type includes
 * global options merged with command options, transformed appropriately.
 */
/**
 * Mapped type that computes the expected command input type for each command in
 * the record. This provides contextual typing for inline command handlers.
 */
type CommandsInput<
  TGlobalOptions extends OptionsSchema,
  TGlobalTransforms extends TransformsConfig<any, any, any, any> | undefined,
  TCommands extends Record<string, AnyCommandConfig>,
> = {
  [K in keyof TCommands]: TCommands[K] extends CommandConfig<
    infer _TGlobalOpts,
    infer _TOpts,
    infer _TPos,
    infer _TTrans
  >
    ? // Command created via opt.command() - preserve its existing type
      TCommands[K]
    : // Inline command - compute handler type from schema
      CommandInput<
        TGlobalOptions,
        TGlobalTransforms,
        TCommands[K]['options'] extends OptionsSchema
          ? TCommands[K]['options']
          : Record<string, never>,
        TCommands[K]['positionals'] extends PositionalsSchema
          ? TCommands[K]['positionals']
          : [],
        TCommands[K]['transforms'] extends TransformsConfig<any, any, any, any>
          ? TCommands[K]['transforms']
          : undefined
      >;
};

/**
 * Base properties shared by all option definitions.
 */
interface OptionBase {
  /** Aliases for this option (e.g., ['v'] for --verbose) */
  aliases?: string[];
  /** Option description displayed in help text */
  description?: string;
  /** Group name for help text organization */
  group?: string;
  /** Whether this option is hidden from help */
  hidden?: boolean;
  /** Whether this option is required */
  required?: boolean;
}

/**
 * Base properties for positional definitions.
 */
interface PositionalBase {
  description?: string;
  /** Display name for help text (defaults to arg0, arg1, etc.) */
  name?: string;
  required?: boolean;
}

/**
 * Partial transform config for inline transforms. Structurally compatible with
 * TransformsConfig while providing contextual typing for callback parameters.
 *
 * Note: Because TypeScript cannot infer return types from inline callbacks and
 * flow them to handlers, using inline transforms without explicit typing means
 * the handler won't know about properties added by transforms. For full type
 * safety, either:
 *
 * 1. Define transforms separately with explicit return types
 * 2. Add type annotations to handler parameters
 *
 * @typeParam TValuesIn - The input values type (from parsed options)
 * @typeParam TPositionalsIn - The input positionals type (from parsed
 *   positionals)
 */
type TransformsInput<TValuesIn, TPositionalsIn extends readonly unknown[]> = {
  /** Transform parsed positionals tuple */
  positionals?: (
    positionals: TPositionalsIn,
  ) => Promise<readonly unknown[]> | readonly unknown[];
  /** Transform parsed option values */
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents -- union needed for return type inference
  values?: (values: TValuesIn) => Promise<unknown> | unknown;
};
