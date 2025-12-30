/**
 * Builder functions for defining CLI options, positionals, and commands.
 *
 * Provides ergonomic helpers with full TypeScript type inference for
 * constructing option schemas (`opt.string()`, `opt.boolean()`, `opt.enum()`,
 * etc.), positional schemas (`opt.stringPos()`, `opt.numberPos()`,
 * `opt.variadic()`), and command definitions (`opt.command()`). Includes
 * composition utilities for merging schemas (`opt.options()`,
 * `opt.positionals()`).
 *
 * @packageDocumentation
 */

import type {
  ArrayOption,
  BooleanOption,
  CommandConfig,
  CountOption,
  EnumOption,
  EnumPositional,
  NumberOption,
  NumberPositional,
  OptionsSchema,
  PositionalDef,
  PositionalsSchema,
  StringOption,
  StringPositional,
  VariadicPositional,
} from './types.js';

import { BargsError } from './errors.js';

/**
 * Validate that no alias conflicts exist in a merged options schema. Throws
 * BargsError if the same alias is used by multiple options.
 */
const validateAliasConflicts = (schema: OptionsSchema): void => {
  const aliasToOption = new Map<string, string>();

  for (const [optionName, def] of Object.entries(schema)) {
    if (!def.aliases) {
      continue;
    }

    for (const alias of def.aliases) {
      const existing = aliasToOption.get(alias);
      if (existing && existing !== optionName) {
        throw new BargsError(
          `Alias conflict: "-${alias}" is used by both "--${existing}" and "--${optionName}"`,
        );
      }
      aliasToOption.set(alias, optionName);
    }
  }
};

/**
 * Compose multiple option schemas into one.
 */
const optionsImpl = (...schemas: OptionsSchema[]): OptionsSchema => {
  const merged = Object.assign({}, ...schemas) as OptionsSchema;
  validateAliasConflicts(merged);
  return merged;
};

/**
 * Create a positionals schema from positional definitions.
 */
const positionalsImpl = <T extends PositionalsSchema>(...positionals: T): T =>
  positionals;

/**
 * Namespaced option builders.
 *
 * Provides ergonomic helpers for defining CLI options, positionals, and
 * commands with full TypeScript type inference.
 *
 * @example
 *
 * ```typescript
 * import { opt } from 'bargs';
 *
 * const options = opt.options({
 *   verbose: opt.boolean({ aliases: ['v'] }),
 *   name: opt.string({ default: 'world' }),
 *   level: opt.enum(['low', 'medium', 'high'] as const),
 * });
 * ```
 */
export const opt = {
  // ─── Option Builders ───────────────────────────────────────────────

  /**
   * Define an array option (--flag value --flag value2).
   */
  array: (
    items: 'number' | 'string',
    props: Omit<ArrayOption, 'items' | 'type'> = {},
  ): ArrayOption => ({
    items,
    type: 'array',
    ...props,
  }),

  /**
   * Define a boolean option. Props type is preserved to enable default
   * inference.
   */
  boolean: <
    P extends Omit<BooleanOption, 'type'> = Omit<BooleanOption, 'type'>,
  >(
    props: P = {} as P,
  ): BooleanOption & P =>
    ({
      type: 'boolean',
      ...props,
    }) as BooleanOption & P,

  /**
   * Define a command with proper type inference.
   *
   * @example
   *
   * ```typescript
   * const greetCmd = opt.command({
   *   description: 'Greet someone',
   *   options: opt.options({
   *     name: opt.string({ default: 'world' }),
   *   }),
   *   handler: ({ values }) => {
   *     console.log(`Hello, ${values.name}!`);
   *   },
   * });
   * ```
   */
  command: <
    TOptions extends OptionsSchema = OptionsSchema,
    TPositionals extends PositionalsSchema = PositionalsSchema,
  >(
    config: CommandConfig<TOptions, TPositionals>,
  ): CommandConfig<TOptions, TPositionals> => config,

  /**
   * Define a count option (--verbose --verbose = 2).
   */
  count: (props: Omit<CountOption, 'type'> = {}): CountOption => ({
    type: 'count',
    ...props,
  }),

  /**
   * Define an enum option with string choices. The choices array is inferred as
   * a tuple of literal types automatically. Props type is preserved to enable
   * default inference.
   */
  enum: <
    const T extends readonly string[],
    P extends Omit<EnumOption<T[number]>, 'choices' | 'type'> = Omit<
      EnumOption<T[number]>,
      'choices' | 'type'
    >,
  >(
    choices: T,
    props: P = {} as P,
  ): EnumOption<T[number]> & P =>
    ({
      choices,
      type: 'enum',
      ...props,
    }) as EnumOption<T[number]> & P,

  /**
   * Define an enum positional argument with string choices. The choices array
   * is inferred as a tuple of literal types automatically.
   */
  enumPos: <
    const T extends readonly string[],
    P extends Omit<EnumPositional<T[number]>, 'choices' | 'type'> = Omit<
      EnumPositional<T[number]>,
      'choices' | 'type'
    >,
  >(
    choices: T,
    props: P = {} as P,
  ): EnumPositional<T[number]> & P =>
    ({
      choices,
      type: 'enum',
      ...props,
    }) as EnumPositional<T[number]> & P,

  /**
   * Define a number option. Props type is preserved to enable default
   * inference.
   */
  number: <P extends Omit<NumberOption, 'type'> = Omit<NumberOption, 'type'>>(
    props: P = {} as P,
  ): NumberOption & P =>
    ({
      type: 'number',
      ...props,
    }) as NumberOption & P,

  // ─── Positional Builders ───────────────────────────────────────────

  /**
   * Define a number positional argument.
   */
  numberPos: (
    props: Omit<NumberPositional, 'type'> = {},
  ): NumberPositional => ({
    type: 'number',
    ...props,
  }),

  /**
   * Compose multiple option schemas into one. Later schemas override earlier
   * ones for duplicate option names. Validates that no alias conflicts exist.
   *
   * @example
   *
   * ```typescript
   * // Single schema (identity, enables reuse)
   * const loggingOpts = opt.options({
   *   verbose: opt.boolean({ aliases: ['v'] }),
   *   quiet: opt.boolean({ aliases: ['q'] }),
   * });
   *
   * // Merge multiple schemas
   * const allOpts = opt.options(loggingOpts, ioOpts, {
   *   format: opt.enum(['json', 'yaml'] as const),
   * });
   * ```
   *
   * @throws BargsError if multiple options use the same alias
   */
  options: optionsImpl as {
    <A extends OptionsSchema>(a: A): A;
    <A extends OptionsSchema, B extends OptionsSchema>(a: A, b: B): A & B;
    <A extends OptionsSchema, B extends OptionsSchema, C extends OptionsSchema>(
      a: A,
      b: B,
      c: C,
    ): A & B & C;
    <
      A extends OptionsSchema,
      B extends OptionsSchema,
      C extends OptionsSchema,
      D extends OptionsSchema,
    >(
      a: A,
      b: B,
      c: C,
      d: D,
    ): A & B & C & D;
    (...schemas: OptionsSchema[]): OptionsSchema;
  },

  /**
   * Create a positionals schema with proper tuple type inference.
   *
   * @example
   *
   * ```typescript
   * const positionals = opt.positionals(
   *   opt.stringPos({ description: 'Input file', required: true }),
   *   opt.stringPos({ description: 'Output file' }),
   * );
   * ```
   */
  positionals: positionalsImpl as {
    <A extends PositionalDef>(a: A): [A];
    <A extends PositionalDef, B extends PositionalDef>(a: A, b: B): [A, B];
    <A extends PositionalDef, B extends PositionalDef, C extends PositionalDef>(
      a: A,
      b: B,
      c: C,
    ): [A, B, C];
    <
      A extends PositionalDef,
      B extends PositionalDef,
      C extends PositionalDef,
      D extends PositionalDef,
    >(
      a: A,
      b: B,
      c: C,
      d: D,
    ): [A, B, C, D];
    (...positionals: PositionalDef[]): PositionalsSchema;
  },

  /**
   * Define a string option. Props type is preserved to enable default
   * inference.
   */
  string: <P extends Omit<StringOption, 'type'> = Omit<StringOption, 'type'>>(
    props: P = {} as P,
  ): P & StringOption =>
    ({
      type: 'string',
      ...props,
    }) as P & StringOption,

  // ─── Composition ───────────────────────────────────────────────────

  /**
   * Define a string positional argument.
   */
  stringPos: (
    props: Omit<StringPositional, 'type'> = {},
  ): StringPositional => ({
    type: 'string',
    ...props,
  }),

  // ─── Command Builder ───────────────────────────────────────────────

  /**
   * Define a variadic positional (rest args).
   */
  variadic: (
    items: 'number' | 'string',
    props: Omit<VariadicPositional, 'items' | 'type'> = {},
  ): VariadicPositional => ({
    items,
    type: 'variadic',
    ...props,
  }),
};
