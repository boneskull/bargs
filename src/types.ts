/**
 * TypeScript type definitions for the bargs CLI argument parser.
 *
 * Defines all public interfaces and types including:
 *
 * - Option definitions (`StringOption`, `BooleanOption`, `EnumOption`, etc.)
 * - Positional definitions (`StringPositional`, `VariadicPositional`, etc.)
 * - Schema types (`OptionsSchema`, `PositionalsSchema`)
 * - Type inference utilities (`InferOptions`, `InferPositionals`)
 * - Parser combinator types (`Parser`, `Command`, `ParseResult`)
 *
 * @packageDocumentation
 */

import type { ThemeInput } from './theme.js';

// ═══════════════════════════════════════════════════════════════════════════════
// OPTION DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

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
 * Boolean option definition.
 */
export interface BooleanOption extends OptionBase {
  default?: boolean;
  type: 'boolean';
}

/**
 * CLI builder for fluent configuration.
 */
export interface CliBuilder<
  TGlobalValues = Record<string, never>,
  TGlobalPositionals extends readonly unknown[] = readonly [],
> {
  /**
   * Register a command with a Command object.
   *
   * Note: When using this form, the handler only sees command-local types. Use
   * the (parser, handler) form for merged global+command types.
   */
  command<CV, CP extends readonly unknown[]>(
    name: string,
    cmd: Command<CV, CP>,
    description?: string,
  ): CliBuilder<TGlobalValues, TGlobalPositionals>;

  /**
   * Register a command with a Parser and handler separately.
   *
   * This form provides full type inference for merged global + command types.
   * The handler receives `TGlobalValues & CV` for values.
   */
  command<CV, CP extends readonly unknown[]>(
    name: string,
    parser: Parser<CV, CP>,
    handler: HandlerFn<CV & TGlobalValues, CP>,
    description?: string,
  ): CliBuilder<TGlobalValues, TGlobalPositionals>;

  /**
   * Set the default command by name (must be registered first).
   */
  defaultCommand(name: string): CliBuilder<TGlobalValues, TGlobalPositionals>;

  /**
   * Set the default command with a Command object.
   *
   * Note: When using this form, the handler only sees command-local types. Use
   * the (parser, handler) form for merged global+command types.
   */
  defaultCommand<CV, CP extends readonly unknown[]>(
    cmd: Command<CV, CP>,
  ): CliBuilder<TGlobalValues, TGlobalPositionals>;

  /**
   * Set the default command with a Parser and handler separately.
   *
   * This form provides full type inference for merged global + command types.
   * The handler receives `TGlobalValues & CV` for values.
   */
  defaultCommand<CV, CP extends readonly unknown[]>(
    parser: Parser<CV, CP>,
    handler: HandlerFn<CV & TGlobalValues, CP>,
  ): CliBuilder<TGlobalValues, TGlobalPositionals>;

  /**
   * Set global options/transforms that apply to all commands.
   */
  globals<V, P extends readonly unknown[]>(
    parser: Parser<V, P>,
  ): CliBuilder<V, P>;

  /**
   * Parse arguments synchronously and run handlers.
   *
   * Throws if any transform or handler returns a Promise.
   */
  parse(
    args?: string[],
  ): ParseResult<TGlobalValues, TGlobalPositionals> & { command?: string };

  /**
   * Parse arguments asynchronously and run handlers.
   *
   * Supports async transforms and handlers.
   */
  parseAsync(
    args?: string[],
  ): Promise<
    ParseResult<TGlobalValues, TGlobalPositionals> & { command?: string }
  >;
}

/**
 * Result from CLI execution (extends ParseResult with command name).
 */
export interface CliResult<
  TValues = Record<string, unknown>,
  TPositionals extends readonly unknown[] = readonly unknown[],
> extends ParseResult<TValues, TPositionals> {
  /** The command that was executed, if any */
  command?: string;
}

/**
 * Command with handler attached (terminal in the pipeline).
 */
export interface Command<
  TValues = Record<string, unknown>,
  TPositionals extends readonly unknown[] = readonly unknown[],
> {
  /** Brand for type discrimination. Do not use directly. */
  readonly __brand: 'Command';
  /** Options schema. Do not use directly. */
  readonly __optionsSchema: OptionsSchema;
  /** Positionals schema. Do not use directly. */
  readonly __positionalsSchema: PositionalsSchema;
  /** Command description for help text */
  readonly description?: string;
  /** The handler function */
  readonly handler: HandlerFn<TValues, TPositionals>;
}

/**
 * Registered command definition.
 */
export interface CommandDef<
  TValues = Record<string, unknown>,
  TPositionals extends readonly unknown[] = readonly unknown[],
> {
  /** The command */
  readonly command: Command<TValues, TPositionals>;
  /** Description for help */
  readonly description?: string;
  /** Command name */
  readonly name: string;
}

/**
 * Count option definition (--verbose --verbose = 2).
 */
export interface CountOption extends OptionBase {
  default?: number;
  type: 'count';
}

/**
 * Options for bargs.create().
 */
export interface CreateOptions {
  /** Description shown in help */
  description?: string;
  /** Epilog text shown after help output */
  epilog?: false | string;
  /** Color theme for help output */
  theme?: ThemeInput;
  /** Version string (enables --version flag) */
  version?: string;
}

/**
 * Enum option definition with string choices.
 */
export interface EnumOption<T extends string = string> extends OptionBase {
  choices: readonly T[];
  default?: T;
  type: 'enum';
}

// ═══════════════════════════════════════════════════════════════════════════════
// POSITIONAL DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

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
 * Handler function signature.
 */
export type HandlerFn<TValues, TPositionals extends readonly unknown[]> = (
  result: ParseResult<TValues, TPositionals>,
) => Promise<void> | void;

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
 * Recursively build a tuple type from a positionals schema array.
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
    : T extends readonly []
      ? readonly []
      : readonly InferPositional<T[number]>[];

/**
 * Infer the output positionals type from a transforms config.
 */
export type InferTransformedPositionals<
  TPositionalsIn extends readonly unknown[],
  TTransforms,
> = TTransforms extends { positionals: PositionalsTransformFn<any, infer TOut> }
  ? TOut extends readonly unknown[]
    ? TOut
    : TPositionalsIn
  : TPositionalsIn;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE INFERENCE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Infer the output values type from a transforms config.
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

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSFORMS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Options schema: a record of option names to their definitions.
 */
export type OptionsSchema = Record<string, OptionDef>;

/**
 * Parser represents accumulated parse state with options and positionals
 * schemas. This is a branded type for type-level tracking.
 */
export interface Parser<
  TValues = Record<string, unknown>,
  TPositionals extends readonly unknown[] = readonly unknown[],
> {
  /** Brand for type discrimination. Do not use directly. */
  readonly __brand: 'Parser';
  /** Options schema. Do not use directly. */
  readonly __optionsSchema: OptionsSchema;
  /** Phantom type for positionals. Do not use directly. */
  readonly __positionals: TPositionals;
  /** Positionals schema. Do not use directly. */
  readonly __positionalsSchema: PositionalsSchema;
  /** Phantom type for values. Do not use directly. */
  readonly __values: TValues;
}

/**
 * Core parse result shape flowing through the pipeline.
 */
export interface ParseResult<
  TValues = Record<string, unknown>,
  TPositionals extends readonly unknown[] = readonly unknown[],
> {
  positionals: TPositionals;
  values: TValues;
}

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

// ═══════════════════════════════════════════════════════════════════════════════
// PARSER COMBINATOR TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Positionals transform function.
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
 * Transforms configuration for modifying parsed results.
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
 * Values transform function.
 */
export type ValuesTransformFn<TIn, TOut> = (
  values: TIn,
) => Promise<TOut> | TOut;

// ═══════════════════════════════════════════════════════════════════════════════
// CLI BUILDER TYPES
// ═══════════════════════════════════════════════════════════════════════════════

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
