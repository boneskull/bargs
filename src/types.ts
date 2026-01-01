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
 * Any command config (type-erased for collections). Uses a permissive handler
 * type to avoid variance issues.
 */
export interface AnyCommandConfig {
  description: string;

  handler:
    | ((result: any) => Promise<void> | void)[]
    | ((result: any) => Promise<void> | void);
  options?: OptionsSchema;
  positionals?: PositionalsSchema;
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
 */
export interface BargsConfig<
  TOptions extends OptionsSchema = OptionsSchema,
  TPositionals extends PositionalsSchema = PositionalsSchema,
  TCommands extends Record<string, AnyCommandConfig> | undefined = undefined,
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
  handler?: Handler<
    BargsResult<
      InferOptions<TOptions>,
      InferPositionals<TPositionals>,
      undefined
    >
  >;
  name: string;
  options?: TOptions;
  positionals?: TPositionals;
  version?: string;
}

/**
 * Bargs config with commands (requires commands, allows defaultHandler).
 *
 * Commands can be defined in two ways:
 *
 * 1. Using opt.command() - handler receives local options only (legacy)
 * 2. Inline definition - handler can receive both global and local options
 *
 * Note: Top-level `positionals` is not allowed for command-based CLIs. Each
 * command defines its own positionals.
 */
export type BargsConfigWithCommands<
  TOptions extends OptionsSchema = OptionsSchema,
  TCommands extends Record<string, CommandConfigInput> = Record<
    string,
    CommandConfigInput
  >,
> = Omit<
  BargsConfig<TOptions, PositionalsSchema, TCommands>,
  'handler' | 'positionals'
> & {
  commands: TCommands;
  defaultHandler?:
    | Handler<BargsResult<InferOptions<TOptions>, readonly [], undefined>>
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
 * The handler receives typed local options plus access to global options (as
 * Record<string, unknown>). Global options are available at runtime but require
 * type narrowing to access safely.
 */
export interface CommandConfig<
  TOptions extends OptionsSchema = OptionsSchema,
  TPositionals extends PositionalsSchema = PositionalsSchema,
> {
  description: string;
  handler: Handler<
    BargsResult<
      InferOptions<TOptions> & Record<string, unknown>,
      InferPositionals<TPositionals>,
      string
    >
  >;
  options?: TOptions;
  positionals?: TPositionals;
}

/**
 * Command config input type for inline command definitions. The handler type is
 * intentionally loose here - it accepts any result type, allowing commands
 * defined with opt.command() or inline to work.
 */
export interface CommandConfigInput {
  description: string;
  handler: Handler<any>;
  options?: OptionsSchema;
  positionals?: PositionalsSchema;
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
 * Handler - either a single function or an array of functions. When an array is
 * provided, handlers run sequentially in order.
 */
export type Handler<TResult> = HandlerFn<TResult> | HandlerFn<TResult>[];

/**
 * Single handler function signature.
 */
export type HandlerFn<TResult> = (result: TResult) => Promise<void> | void;

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
