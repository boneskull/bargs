/**
 * Builder functions for defining CLI options and positionals.
 *
 * Provides ergonomic helpers with full TypeScript type inference for
 * constructing option schemas (`opt.string()`, `opt.boolean()`, `opt.enum()`,
 * etc.) and positional schemas (`opt.stringPos()`, `opt.numberPos()`,
 * `opt.variadic()`).
 *
 * @packageDocumentation
 */

import type {
  ArrayOption,
  BooleanOption,
  CountOption,
  EnumArrayOption,
  EnumOption,
  EnumPositional,
  InferOptions,
  InferPositionals,
  NumberOption,
  NumberPositional,
  OptionsSchema,
  Parser,
  PositionalDef,
  PositionalsSchema,
  StringOption,
  StringPositional,
  VariadicPositional,
} from './types.js';

import { BargsError } from './errors.js';

/**
 * Validate that no alias conflicts exist in a merged options schema.
 *
 * @function
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
 * A Parser that can also be called as a function to merge with another parser.
 * This allows `opt.options()` to work both as:
 *
 * - First arg in pipe: used directly as a Parser
 * - Later arg in pipe: called as function to merge with incoming Parser
 *
 * @knipignore
 */
export type CallableOptionsParser<V> = (<V2, P2 extends readonly unknown[]>(
  parser: Parser<V2, P2>,
) => Parser<V & V2, P2>) &
  Parser<V, readonly []>;

/**
 * Create a Parser from an options schema that can also merge with existing
 * parsers.
 *
 * Supports two usage patterns:
 *
 * 1. Standalone: `opt.options({ ... })` - returns a Parser
 * 2. Merging: `pos.positionals(...)(opt.options(...))` - merges positionals into
 *    options
 *
 * @function
 */
const optionsImpl = <T extends OptionsSchema>(
  schema: T,
): CallableOptionsParser<InferOptions<T>> => {
  validateAliasConflicts(schema);

  // Create the merge function
  /**
   * @function
   */
  const merger = <V2, P2 extends readonly unknown[]>(
    parser: Parser<V2, P2>,
  ): Parser<InferOptions<T> & V2, P2> => {
    const mergedSchema = { ...parser.__optionsSchema, ...schema };
    validateAliasConflicts(mergedSchema);

    // Preserve transforms from the incoming parser
    const transformed = parser as Parser<V2, P2> & {
      __transform?: (r: unknown) => unknown;
    };
    const result = {
      ...parser,
      __brand: 'Parser' as const,
      __optionsSchema: mergedSchema,
      __values: {} as InferOptions<T> & V2,
    };
    if (transformed.__transform) {
      (result as Record<string, unknown>).__transform = transformed.__transform;
    }
    return result as Parser<InferOptions<T> & V2, P2>;
  };

  // Add Parser properties to the function
  const parserProps: Parser<InferOptions<T>, readonly []> = {
    __brand: 'Parser',
    __optionsSchema: schema,
    __positionals: [] as const,
    __positionalsSchema: [],
    __values: {} as InferOptions<T>,
  };

  return Object.assign(merger, parserProps) as CallableOptionsParser<
    InferOptions<T>
  >;
};

/**
 * Namespaced option builders.
 *
 * @example
 *
 * ```typescript
 * import { opt } from 'bargs';
 *
 * const parser = opt.options({
 *   verbose: opt.boolean({ aliases: ['v'] }),
 *   name: opt.string({ default: 'world' }),
 *   level: opt.enum(['low', 'medium', 'high']),
 * });
 * ```
 */
export const opt = {
  // ─── Option Builders ───────────────────────────────────────────────

  /**
   * Define an array option (--flag value --flag value2).
   *
   * @example
   *
   * ```typescript
   * // Primitive array
   * opt.array('string'); // --file a.txt --file b.txt → ['a.txt', 'b.txt']
   * opt.array('number'); // --port 80 --port 443 → [80, 443]
   *
   * // Enum array (with choices)
   * opt.array(['low', 'medium', 'high']); // --priority low --priority high
   * ```
   */
  array: ((
    itemsOrChoices: 'number' | 'string' | readonly string[],
    props: Omit<ArrayOption, 'items' | 'type'> = {},
  ): ArrayOption | EnumArrayOption<string> => {
    if (Array.isArray(itemsOrChoices)) {
      // Enum array
      return {
        choices: itemsOrChoices,
        type: 'array',
        ...props,
      } as EnumArrayOption<string>;
    }
    // Primitive array
    return {
      items: itemsOrChoices,
      type: 'array',
      ...props,
    } as ArrayOption;
  }) as {
    // Overload for primitive arrays
    (
      items: 'number' | 'string',
      props?: Omit<ArrayOption, 'items' | 'type'>,
    ): ArrayOption;
    // Overload for enum arrays
    <const T extends readonly string[]>(
      choices: T,
      props?: Omit<EnumArrayOption<T[number]>, 'choices' | 'type'>,
    ): EnumArrayOption<T[number]>;
  },

  /**
   * Define a boolean option.
   *
   * @function
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
   * Define a count option (--verbose --verbose = 2).
   *
   * @function
   */
  count: (props: Omit<CountOption, 'type'> = {}): CountOption => ({
    type: 'count',
    ...props,
  }),

  /**
   * Define an enum option with string choices.
   *
   * @function
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
   * Define an enum positional argument with string choices.
   *
   * @function
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
   * Define a number option.
   *
   * @function
   */
  number: <P extends Omit<NumberOption, 'type'> = Omit<NumberOption, 'type'>>(
    props: P = {} as P,
  ): NumberOption & P =>
    ({
      type: 'number',
      ...props,
    }) as NumberOption & P,

  /**
   * Define a number positional argument.
   *
   * @function
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
   * Create a Parser from an options schema.
   *
   * @example
   *
   * ```typescript
   * const parser = opt.options({
   *   verbose: opt.boolean({ aliases: ['v'] }),
   *   name: opt.string({ default: 'world' }),
   * });
   * // Type: Parser<{ verbose: boolean | undefined, name: string }, []>
   * ```
   */
  options: optionsImpl,

  /**
   * Define a string option.
   *
   * @function
   */
  string: <P extends Omit<StringOption, 'type'> = Omit<StringOption, 'type'>>(
    props: P = {} as P,
  ): P & StringOption =>
    ({
      type: 'string',
      ...props,
    }) as P & StringOption,

  /**
   * Define a string positional argument.
   *
   * @function
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

  /**
   * Define a variadic positional (rest args).
   *
   * @function
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

/**
 * A Parser that can also be called as a function to merge with another parser.
 * This allows `pos.positionals()` to work both as:
 *
 * - First arg in pipe: used directly as a Parser
 * - Later arg in pipe: called as function to merge with incoming Parser
 *
 * For positionals, we DON'T intersect values - we just pass through V2.
 *
 * @knipignore
 */
export type CallablePositionalsParser<P extends readonly unknown[]> = (<
  V2,
  P2 extends readonly unknown[],
>(
  parser: Parser<V2, P2>,
) => Parser<V2, readonly [...P2, ...P]>) &
  Parser<object, P>;

/**
 * Create a Parser from positional definitions that can also merge with existing
 * parsers.
 *
 * Supports two usage patterns:
 *
 * 1. Standalone: `pos.positionals(...)` - returns a Parser
 * 2. Merging: `pos.positionals(...)(opt.options(...))` - merges positionals into
 *    options
 *
 * @function
 */
const positionalsImpl = <T extends PositionalsSchema>(
  ...positionals: T
): CallablePositionalsParser<InferPositionals<T>> => {
  // Create the merge function - just passes through V2, no intersection needed
  /**
   * @function
   */
  const merger = <V2, P2 extends readonly unknown[]>(
    parser: Parser<V2, P2>,
  ): Parser<V2, readonly [...P2, ...InferPositionals<T>]> => {
    // Preserve transforms from the incoming parser
    const transformed = parser as Parser<V2, P2> & {
      __transform?: (r: unknown) => unknown;
    };
    const result = {
      ...parser,
      __brand: 'Parser' as const,
      __positionals: [] as unknown as readonly [...P2, ...InferPositionals<T>],
      __positionalsSchema: [...parser.__positionalsSchema, ...positionals],
    };
    if (transformed.__transform) {
      (result as Record<string, unknown>).__transform = transformed.__transform;
    }
    return result as Parser<V2, readonly [...P2, ...InferPositionals<T>]>;
  };

  // Add Parser properties to the function
  // Use empty object {} instead of Record<string, never> for better intersection behavior
  const parserProps: Parser<object, InferPositionals<T>> = {
    __brand: 'Parser',
    __optionsSchema: {},
    __positionals: [] as unknown as InferPositionals<T>,
    __positionalsSchema: positionals,
    __values: {},
  };

  return Object.assign(merger, parserProps) as CallablePositionalsParser<
    InferPositionals<T>
  >;
};

/**
 * Namespaced positional builders.
 *
 * @example
 *
 * ```typescript
 * import { pos } from 'bargs';
 *
 * const parser = pos.positionals(
 *   pos.string({ name: 'input', required: true }),
 *   pos.string({ name: 'output' }),
 * );
 * ```
 */
export const pos = {
  /**
   * Define an enum positional argument with string choices.
   *
   * @function
   */
  enum: <
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
   * Define a number positional argument.
   *
   * @function
   */
  number: <
    P extends Omit<NumberPositional, 'type'> = Omit<NumberPositional, 'type'>,
  >(
    props: P = {} as P,
  ): NumberPositional & P =>
    ({
      type: 'number',
      ...props,
    }) as NumberPositional & P,

  /**
   * Create a Parser from positional definitions.
   *
   * @example
   *
   * ```typescript
   * const parser = pos.positionals(
   *   pos.string({ name: 'input', required: true }),
   *   pos.string({ name: 'output' }),
   * );
   * // Type: Parser<{}, readonly [string, string | undefined]>
   * ```
   */
  positionals: positionalsImpl as unknown as {
    <A extends PositionalDef>(
      a: A,
    ): CallablePositionalsParser<readonly [InferPositionals<readonly [A]>[0]]>;
    <A extends PositionalDef, B extends PositionalDef>(
      a: A,
      b: B,
    ): CallablePositionalsParser<InferPositionals<readonly [A, B]>>;
    <A extends PositionalDef, B extends PositionalDef, C extends PositionalDef>(
      a: A,
      b: B,
      c: C,
    ): CallablePositionalsParser<InferPositionals<readonly [A, B, C]>>;
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
    ): CallablePositionalsParser<InferPositionals<readonly [A, B, C, D]>>;
    (
      ...positionals: PositionalDef[]
    ): CallablePositionalsParser<readonly unknown[]>;
  },

  /**
   * Define a string positional argument.
   *
   * @function
   */
  string: <
    P extends Omit<StringPositional, 'type'> = Omit<StringPositional, 'type'>,
  >(
    props: P = {} as P,
  ): P & StringPositional =>
    ({
      type: 'string',
      ...props,
    }) as P & StringPositional,

  /**
   * Define a variadic positional (rest args).
   *
   * @function
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
