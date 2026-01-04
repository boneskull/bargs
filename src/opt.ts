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
  TransformsConfig,
  VariadicPositional,
} from './types.js';

import { BargsError } from './errors.js';

/**
 * Command builder interface that supports both direct config and curried global
 * options patterns.
 */
export interface CommandBuilder {
  // Direct usage: bargs.command({ ... })
  <
    const TOptions extends OptionsSchema = OptionsSchema,
    const TPositionals extends PositionalsSchema = PositionalsSchema,
    const TTransforms extends TransformsConfig<any, any, any, any> | undefined =
      undefined,
  >(
    config: CommandConfig<
      Record<string, never>,
      undefined,
      TOptions,
      TPositionals,
      TTransforms
    >,
  ): CommandConfig<
    Record<string, never>,
    undefined,
    TOptions,
    TPositionals,
    TTransforms
  >;

  // Curried usage: bargs.command<typeof globalOpts, typeof globalTransforms>()({ ... })
  <
    TGlobalOptions extends OptionsSchema,
    TGlobalTransforms extends TransformsConfig<any, any, any, any> | undefined =
      undefined,
  >(): <
    const TOptions extends OptionsSchema = OptionsSchema,
    const TPositionals extends PositionalsSchema = PositionalsSchema,
    const TTransforms extends TransformsConfig<any, any, any, any> | undefined =
      undefined,
  >(
    config: CommandConfig<
      TGlobalOptions,
      TGlobalTransforms,
      TOptions,
      TPositionals,
      TTransforms
    >,
  ) => CommandConfig<
    TGlobalOptions,
    TGlobalTransforms,
    TOptions,
    TPositionals,
    TTransforms
  >;
}

/**
 * Implementation of command builder that detects whether it's called with
 * config (direct) or without args (curried for global options).
 */
const commandBuilder = <
  const TGlobalOptions extends OptionsSchema = Record<string, never>,
  const TGlobalTransforms extends
    | TransformsConfig<any, any, any, any>
    | undefined = undefined,
  const TOptions extends OptionsSchema = OptionsSchema,
  const TPositionals extends PositionalsSchema = PositionalsSchema,
  const TTransforms extends TransformsConfig<any, any, any, any> | undefined =
    undefined,
>(
  configOrNothing?: CommandConfig<
    TGlobalOptions,
    TGlobalTransforms,
    TOptions,
    TPositionals,
    TTransforms
  >,
):
  | (<
      const TOptions2 extends OptionsSchema,
      const TPositionals2 extends PositionalsSchema,
      const TTransforms2 extends
        | TransformsConfig<any, any, any, any>
        | undefined,
    >(
      config: CommandConfig<
        TGlobalOptions,
        TGlobalTransforms,
        TOptions2,
        TPositionals2,
        TTransforms2
      >,
    ) => CommandConfig<
      TGlobalOptions,
      TGlobalTransforms,
      TOptions2,
      TPositionals2,
      TTransforms2
    >)
  | CommandConfig<
      TGlobalOptions,
      TGlobalTransforms,
      TOptions,
      TPositionals,
      TTransforms
    > => {
  if (configOrNothing === undefined) {
    // Curried usage: return function that accepts config
    return <
      const TOptions2 extends OptionsSchema,
      const TPositionals2 extends PositionalsSchema,
      const TTransforms2 extends
        | TransformsConfig<any, any, any, any>
        | undefined,
    >(
      config: CommandConfig<
        TGlobalOptions,
        TGlobalTransforms,
        TOptions2,
        TPositionals2,
        TTransforms2
      >,
    ) => config;
  }
  // Direct usage: return config as-is
  return configOrNothing;
};

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
   * Three usage patterns:
   *
   * 1. Simple usage (no global options): `bargs.command({ ... })`
   * 2. With global options: `bargs.command<typeof globalOptions>()({ ... })`
   * 3. With global options AND transforms: `bargs.command<typeof globalOptions,
   *    typeof globalTransforms>()({ ... })`
   *
   * @example
   *
   * ```typescript
   * // Simple usage - no global options typed
   * const simpleCmd = bargs.command({
   *   description: 'Simple command',
   *   handler: ({ values }) => { ... },
   * });
   *
   * // With global options typed
   * const globalOptions = {
   *   verbose: bargs.boolean({ aliases: ['v'] }),
   * } as const;
   *
   * const greetCmd = bargs.command<typeof globalOptions>()({
   *   description: 'Greet someone',
   *   options: { name: bargs.string({ default: 'world' }) },
   *   handler: ({ values }) => {
   *     // values.verbose is properly typed as boolean | undefined
   *     console.log(`Hello, ${values.name}!`);
   *   },
   * });
   *
   * // With global options AND global transforms typed
   * const globalTransforms = {
   *   values: (v) => ({ ...v, timestamp: Date.now() }),
   * } as const;
   *
   * const timedCmd = bargs.command<typeof globalOptions, typeof globalTransforms>()({
   *   description: 'Time-aware command',
   *   handler: ({ values }) => {
   *     // values.timestamp is properly typed from global transforms
   *     console.log(`Ran at ${values.timestamp}`);
   *   },
   * });
   * ```
   */
  command: commandBuilder as CommandBuilder,

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
   * Define a number positional argument. Props type is preserved to enable
   * required inference.
   */
  numberPos: <
    P extends Omit<NumberPositional, 'type'> = Omit<NumberPositional, 'type'>,
  >(
    props: P = {} as P,
  ): NumberPositional & P =>
    ({
      type: 'number',
      ...props,
    }) as NumberPositional & P,

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
   * Define a string positional argument. Props type is preserved to enable
   * required inference.
   */
  stringPos: <
    P extends Omit<StringPositional, 'type'> = Omit<StringPositional, 'type'>,
  >(
    props: P = {} as P,
  ): P & StringPositional =>
    ({
      type: 'string',
      ...props,
    }) as P & StringPositional,

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
