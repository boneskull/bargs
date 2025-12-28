// src/opt.ts
import type {
  ArrayOption,
  BooleanOption,
  CommandConfig,
  CountOption,
  EnumOption,
  NumberOption,
  NumberPositional,
  OptionsSchema,
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
    if (!def.aliases) continue;

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
function optionsImpl(...schemas: OptionsSchema[]): OptionsSchema {
  const merged = Object.assign({}, ...schemas) as OptionsSchema;
  validateAliasConflicts(merged);
  return merged;
}

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
   * Define a string option.
   */
  string: (props: Omit<StringOption, 'type'> = {}): StringOption => ({
    type: 'string',
    ...props,
  }),

  /**
   * Define a number option.
   */
  number: (props: Omit<NumberOption, 'type'> = {}): NumberOption => ({
    type: 'number',
    ...props,
  }),

  /**
   * Define a boolean option.
   */
  boolean: (props: Omit<BooleanOption, 'type'> = {}): BooleanOption => ({
    type: 'boolean',
    ...props,
  }),

  /**
   * Define an enum option with string choices.
   */
  enum: <T extends string>(
    choices: readonly T[],
    props: Omit<EnumOption<T>, 'choices' | 'type'> = {},
  ): EnumOption<T> => ({
    type: 'enum',
    choices,
    ...props,
  }),

  /**
   * Define an array option (--flag value --flag value2).
   */
  array: (
    items: 'number' | 'string',
    props: Omit<ArrayOption, 'items' | 'type'> = {},
  ): ArrayOption => ({
    type: 'array',
    items,
    ...props,
  }),

  /**
   * Define a count option (--verbose --verbose = 2).
   */
  count: (props: Omit<CountOption, 'type'> = {}): CountOption => ({
    type: 'count',
    ...props,
  }),

  // ─── Positional Builders ───────────────────────────────────────────

  /**
   * Define a string positional argument.
   */
  stringPos: (props: Omit<StringPositional, 'type'> = {}): StringPositional => ({
    type: 'string',
    ...props,
  }),

  /**
   * Define a number positional argument.
   */
  numberPos: (props: Omit<NumberPositional, 'type'> = {}): NumberPositional => ({
    type: 'number',
    ...props,
  }),

  /**
   * Define a variadic positional (rest args).
   */
  variadic: (
    items: 'number' | 'string',
    props: Omit<VariadicPositional, 'items' | 'type'> = {},
  ): VariadicPositional => ({
    type: 'variadic',
    items,
    ...props,
  }),

  // ─── Composition ───────────────────────────────────────────────────

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
   * const allOpts = opt.options(
   *   loggingOpts,
   *   ioOpts,
   *   { format: opt.enum(['json', 'yaml'] as const) },
   * );
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

  // ─── Command Builder ───────────────────────────────────────────────

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
  command: <TOptions extends OptionsSchema, TPositionals extends PositionalsSchema>(
    config: CommandConfig<TOptions, TPositionals>,
  ): CommandConfig<TOptions, TPositionals> => config,
};
