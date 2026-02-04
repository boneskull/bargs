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
 *
 * @group Option Types
 */
export interface ArrayOption extends OptionBase {
  default?: number[] | string[];
  /** Element type of the array (for primitive arrays) */
  items?: 'number' | 'string';
  type: 'array';
}

/**
 * Boolean option definition.
 *
 * @group Option Types
 */
export interface BooleanOption extends OptionBase {
  default?: boolean;
  type: 'boolean';
}

/**
 * Transform all keys of an object type from kebab-case to camelCase.
 *
 * Used with `camelCaseValues` to provide type-safe camelCase option keys.
 *
 * @example
 *
 * ```typescript
 * type Original = { 'output-dir': string; 'dry-run': boolean };
 * type Camel = CamelCaseKeys<Original>; // { outputDir: string; dryRun: boolean }
 * ```
 *
 * @group Type Utilities
 */
export type CamelCaseKeys<T> = {
  [K in keyof T as KebabToCamel<K & string>]: T[K];
};

/**
 * CLI builder for fluent configuration.
 *
 * @group Parser Types
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
    options?: CommandOptions | string,
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
    options?: CommandOptions | string,
  ): CliBuilder<TGlobalValues, TGlobalPositionals>;

  /**
   * Register a nested command group using a factory function.
   *
   * This form provides full type inference - the factory receives a builder
   * that already has parent globals typed, so all nested command handlers see
   * the merged types.
   *
   * @example
   *
   * ```typescript
   * bargs('main')
   *   .globals(opt.options({ verbose: opt.boolean() }))
   *   .command(
   *     'remote',
   *     (remote) =>
   *       remote.command('add', addParser, ({ values }) => {
   *         // values.verbose is typed correctly!
   *       }),
   *     'Manage remotes',
   *   );
   * ```
   */
  command<CV, CP extends readonly unknown[]>(
    name: string,
    factory: (
      builder: CliBuilder<TGlobalValues, TGlobalPositionals>,
    ) => CliBuilder<CV, CP>,
    options?: CommandOptions | string,
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
   * Set or extend global options/transforms that apply to all commands.
   *
   * When called on a builder that already has globals (e.g., from a factory),
   * the new globals are merged with existing ones.
   */
  globals<V, P extends readonly unknown[]>(
    parser: Parser<V, P>,
  ): CliBuilder<TGlobalValues & V, readonly [...TGlobalPositionals, ...P]>;

  /**
   * Parse arguments synchronously and run handlers.
   *
   * Throws if any transform or handler returns a Promise.
   *
   * @remarks
   * Early exit scenarios (`--help`, `--version`, `--completion-script`, or
   * invalid/missing commands) will call `process.exit()` and never return. This
   * is standard CLI behavior.
   */
  parse(args?: string[]): ParseResult<TGlobalValues, TGlobalPositionals> & {
    command?: string;
  };

  /**
   * Parse arguments asynchronously and run handlers.
   *
   * Supports async transforms and handlers.
   *
   * @remarks
   * Early exit scenarios (`--help`, `--version`, `--completion-script`, or
   * invalid/missing commands) will call `process.exit()` and never return. This
   * is standard CLI behavior.
   */
  parseAsync(args?: string[]): Promise<
    ParseResult<TGlobalValues, TGlobalPositionals> & {
      command?: string;
    }
  >;
}

/**
 * Result from CLI execution (extends ParseResult with command name).
 *
 * @group Parser Types
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
 *
 * @group Parser Types
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
 *
 * @group Parser Types
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
 * Options for command registration.
 *
 * Used as an alternative to a simple string description when registering
 * commands, allowing additional configuration like aliases.
 *
 * @example
 *
 * ```typescript
 * .command('add', addParser, handler, {
 *   description: 'Add a new item',
 *   aliases: ['a', 'new']
 * })
 * ```
 *
 * @group Parser Types
 */
export interface CommandOptions {
  /**
   * Alternative names for this command.
   *
   * @example
   *
   * ```typescript
   * { "aliases": ["co", "sw"] } // 'checkout' can be invoked as 'co' or 'sw'
   * ```
   */
  aliases?: string[];
  /** Command description displayed in help text */
  description?: string;
}

/**
 * Count option definition (--verbose --verbose = 2).
 *
 * @group Option Types
 */
export interface CountOption extends OptionBase {
  default?: number;
  type: 'count';
}

/**
 * Options for bargs().
 *
 * @group Core API
 */
export interface CreateOptions {
  /**
   * Enable shell completion support.
   *
   * When `true`, the CLI will respond to:
   *
   * - `--completion-script <shell>` - Output shell completion script
   * - `--get-bargs-completions <shell> <...words>` - Return completion candidates
   *
   * Supported shells: bash, zsh, fish
   *
   * @example
   *
   * ```typescript
   * bargs('mytool', { completion: true })
   *   .command('build', ...)
   *   .parseAsync();
   *
   * // Then run: mytool --completion-script bash >> ~/.bashrc
   * ```
   */
  completion?: boolean;
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
 * Enum array option definition (--flag a --flag b with limited choices).
 *
 * @group Option Types
 */
export interface EnumArrayOption<T extends string = string> extends OptionBase {
  /** Valid choices for array elements */
  choices: readonly T[];
  default?: T[];
  type: 'array';
}

// ═══════════════════════════════════════════════════════════════════════════════
// POSITIONAL DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Enum option definition with string choices.
 *
 * @group Option Types
 */
export interface EnumOption<T extends string = string> extends OptionBase {
  choices: readonly T[];
  default?: T;
  type: 'enum';
}

/**
 * Enum positional definition with string choices.
 *
 * @group Positional Types
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
 *
 * @group Parser Types
 */
export type HandlerFn<TValues, TPositionals extends readonly unknown[]> = (
  result: ParseResult<TValues, TPositionals>,
) => Promise<void> | void;

/**
 * Infer the TypeScript type from an option definition.
 *
 * @group Type Utilities
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
        : T extends EnumArrayOption<infer E>
          ? E[]
          : T extends ArrayOption
            ? T['items'] extends 'number'
              ? number[]
              : string[]
            : T extends CountOption
              ? number
              : never;

// ═══════════════════════════════════════════════════════════════════════════════
// CAMELCASE UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Infer values type from an options schema.
 *
 * @group Type Utilities
 */
export type InferOptions<T extends OptionsSchema> = {
  [K in keyof T]: InferOption<T[K]>;
};

/**
 * Infer a single positional's type.
 *
 * @group Type Utilities
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
 *
 * @group Type Utilities
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
 *
 * @group Type Utilities
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
 * Infer the output values type from a transforms config.
 *
 * @group Type Utilities
 */
export type InferTransformedValues<TValuesIn, TTransforms> =
  TTransforms extends { values: ValuesTransformFn<any, infer TOut> }
    ? TOut
    : TValuesIn;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE INFERENCE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Convert a kebab-case string type to camelCase.
 *
 * @example
 *
 * ```typescript
 * type Result = KebabToCamel<'output-dir'>; // 'outputDir'
 * type Nested = KebabToCamel<'my-long-option'>; // 'myLongOption'
 * ```
 *
 * @group Type Utilities
 */
export type KebabToCamel<S extends string> = S extends `${infer T}-${infer U}`
  ? `${T}${Capitalize<KebabToCamel<U>>}`
  : S;

/**
 * Number option definition.
 *
 * @group Option Types
 */
export interface NumberOption extends OptionBase {
  default?: number;
  type: 'number';
}

/**
 * Number positional.
 *
 * @group Positional Types
 */
export interface NumberPositional extends PositionalBase {
  default?: number;
  type: 'number';
}

/**
 * Union of all option definitions.
 *
 * @group Option Types
 */
export type OptionDef =
  | ArrayOption
  | BooleanOption
  | CountOption
  | EnumArrayOption<string>
  | EnumOption<string>
  | NumberOption
  | StringOption;

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSFORMS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Options schema: a record of option names to their definitions.
 *
 * @group Option Types
 */
export type OptionsSchema = Record<string, OptionDef>;

/**
 * Parser represents accumulated parse state with options and positionals
 * schemas. This is a branded type for type-level tracking.
 *
 * @group Parser Types
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
 *
 * @group Parser Types
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
 *
 * @group Positional Types
 */
export type PositionalDef =
  | EnumPositional<string>
  | NumberPositional
  | StringPositional
  | VariadicPositional;

/**
 * Positionals can be a tuple (ordered) or a single variadic.
 *
 * @group Positional Types
 */
export type PositionalsSchema = readonly PositionalDef[];

// ═══════════════════════════════════════════════════════════════════════════════
// PARSER COMBINATOR TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Positionals transform function.
 *
 * @group Parser Types
 */
export type PositionalsTransformFn<
  TIn extends readonly unknown[],
  TOut extends readonly unknown[],
> = (positionals: TIn) => Promise<TOut> | TOut;

/**
 * String option definition.
 *
 * @group Option Types
 */
export interface StringOption extends OptionBase {
  default?: string;
  type: 'string';
}

/**
 * String positional.
 *
 * @group Positional Types
 */
export interface StringPositional extends PositionalBase {
  default?: string;
  type: 'string';
}

/**
 * Transforms configuration for modifying parsed results.
 *
 * @group Parser Types
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
 *
 * @group Parser Types
 */
export type ValuesTransformFn<TIn, TOut> = (
  values: TIn,
) => Promise<TOut> | TOut;

// ═══════════════════════════════════════════════════════════════════════════════
// CLI BUILDER TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Variadic positional (rest args).
 *
 * @group Positional Types
 */
export interface VariadicPositional extends PositionalBase {
  items: 'number' | 'string';
  type: 'variadic';
}

/**
 * Base properties shared by all option definitions.
 */
interface OptionBase {
  /**
   * Short or long aliases for this option.
   *
   * - Single-character aliases (e.g., `'v'`) become short flags (`-v`)
   * - Multi-character aliases (e.g., `'verb'`) become long flags (`--verb`)
   *
   * @example
   *
   * ```typescript
   * opt.boolean({ aliases: ['v', 'verb'] }); // -v, --verb, --verbose
   * ```
   */
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
