# Remove Zod and Redesign API Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Zod-based schema definitions with a traditional, explicit option definition API while maintaining full TypeScript type safety.

**Architecture:** Move from Zod introspection (runtime schema inspection) to explicit option/positional definitions that capture type information at definition time. The new API uses discriminated union types for option kinds (`string`, `boolean`, `number`, `enum`, `array`) with explicit properties for `default`, `description`, `choices`, `aliases`, etc.

**Tech Stack:** TypeScript 5.x, Node.js util.parseArgs, no runtime dependencies

---

## Part 1: Design the New API

### Task 1: Create New Type Definitions

**Files:**
- Create: `src/types-new.ts` (will replace `src/types.ts` after full migration)

**Step 1: Define the core option types**

```typescript
// src/types-new.ts

/**
 * Base properties shared by all option definitions.
 */
interface OptionBase {
  /** Option description displayed in help text */
  description?: string;
  /** Aliases for this option (e.g., ['v'] for --verbose) */
  aliases?: string[];
  /** Group name for help text organization */
  group?: string;
  /** Whether this option is required */
  required?: boolean;
  /** Whether this option is hidden from help */
  hidden?: boolean;
}

/**
 * String option definition.
 */
export interface StringOption extends OptionBase {
  type: 'string';
  default?: string;
}

/**
 * Number option definition.
 */
export interface NumberOption extends OptionBase {
  type: 'number';
  default?: number;
}

/**
 * Boolean option definition.
 */
export interface BooleanOption extends OptionBase {
  type: 'boolean';
  default?: boolean;
}

/**
 * Enum option definition with string choices.
 */
export interface EnumOption<T extends string = string> extends OptionBase {
  type: 'enum';
  choices: readonly T[];
  default?: T;
}

/**
 * Array option definition (--flag value --flag value2).
 */
export interface ArrayOption extends OptionBase {
  type: 'array';
  /** Element type of the array */
  items: 'string' | 'number';
  default?: string[] | number[];
}

/**
 * Count option definition (--verbose --verbose = 2).
 */
export interface CountOption extends OptionBase {
  type: 'count';
  default?: number;
}

/**
 * Union of all option definitions.
 */
export type OptionDef =
  | StringOption
  | NumberOption
  | BooleanOption
  | EnumOption<string>
  | ArrayOption
  | CountOption;

/**
 * Options schema: a record of option names to their definitions.
 */
export type OptionsSchema = Record<string, OptionDef>;
```

**Step 2: Define positional argument types**

```typescript
/**
 * Base properties for positional definitions.
 */
interface PositionalBase {
  description?: string;
  required?: boolean;
}

/**
 * String positional.
 */
export interface StringPositional extends PositionalBase {
  type: 'string';
  default?: string;
}

/**
 * Number positional.
 */
export interface NumberPositional extends PositionalBase {
  type: 'number';
  default?: number;
}

/**
 * Variadic positional (rest args).
 */
export interface VariadicPositional extends PositionalBase {
  type: 'variadic';
  items: 'string' | 'number';
}

/**
 * Union of positional definitions.
 */
export type PositionalDef = StringPositional | NumberPositional | VariadicPositional;

/**
 * Positionals can be a tuple (ordered) or a single variadic.
 */
export type PositionalsSchema = PositionalDef[];
```

**Step 3: Define type inference utilities**

```typescript
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
export type InferPositional<T extends PositionalDef> = T extends NumberPositional
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
  : T extends VariadicPositional
    ? T['items'] extends 'number'
      ? number[]
      : string[]
  : never;

/**
 * Infer positionals tuple type from schema.
 */
export type InferPositionals<T extends PositionalsSchema> = {
  [K in keyof T]: T[K] extends PositionalDef ? InferPositional<T[K]> : never;
};
```

**Step 4: Define the main config types**

```typescript
/**
 * Handler function signature.
 */
export type Handler<TResult> = (result: TResult) => Promise<void> | void;

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
 * Command configuration.
 */
export interface CommandConfig<
  TOptions extends OptionsSchema = OptionsSchema,
  TPositionals extends PositionalsSchema = PositionalsSchema,
> {
  description: string;
  options?: TOptions;
  positionals?: TPositionals;
  handler: Handler<
    BargsResult<InferOptions<TOptions>, InferPositionals<TPositionals>, string>
  >;
}

/**
 * Any command config (type-erased for collections).
 */
export type AnyCommandConfig = CommandConfig<OptionsSchema, PositionalsSchema>;

/**
 * Main bargs configuration.
 */
export interface BargsConfig<
  TOptions extends OptionsSchema = OptionsSchema,
  TPositionals extends PositionalsSchema = PositionalsSchema,
  TCommands extends Record<string, AnyCommandConfig> | undefined = undefined,
> {
  name: string;
  version?: string;
  description?: string;
  options?: TOptions;
  positionals?: TPositionals;
  commands?: TCommands;
  handler?: Handler<
    BargsResult<InferOptions<TOptions>, InferPositionals<TPositionals>, undefined>
  >;
  args?: string[];
}

/**
 * Bargs config with commands (requires commands, allows defaultHandler).
 */
export type BargsConfigWithCommands<
  TOptions extends OptionsSchema = OptionsSchema,
  TPositionals extends PositionalsSchema = PositionalsSchema,
  TCommands extends Record<string, AnyCommandConfig> = Record<string, AnyCommandConfig>,
> = Omit<BargsConfig<TOptions, TPositionals, TCommands>, 'handler'> & {
  commands: TCommands;
  defaultHandler?:
    | Handler<BargsResult<InferOptions<TOptions>, [], undefined>>
    | keyof TCommands;
};
```

**Step 5: Run TypeScript compiler to verify types**

Run: `npx tsc --noEmit src/types-new.ts`
Expected: No errors

**Step 6: Commit**

```bash
git add src/types-new.ts
git commit -m "feat: add new Zod-free type definitions

Define explicit option and positional types with full TypeScript
inference. This replaces Zod schema introspection with discriminated
unions that capture type information at definition time."
```

---

### Task 2: Create Namespaced `opt` Builder

**Files:**
- Create: `src/opt.ts`

**Step 1: Write the namespaced opt object with composition support**

```typescript
// src/opt.ts
import type {
  ArrayOption,
  BooleanOption,
  CommandConfig,
  CountOption,
  EnumOption,
  NumberOption,
  NumberPositional,
  OptionDef,
  OptionsSchema,
  PositionalsSchema,
  StringOption,
  StringPositional,
  VariadicPositional,
} from './types-new.js';

import { BargsError } from './errors.js';

/**
 * Validate that no alias conflicts exist in a merged options schema.
 * Throws BargsError if the same alias is used by multiple options.
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
 * Namespaced option builders.
 *
 * Provides ergonomic helpers for defining CLI options, positionals, and commands
 * with full TypeScript type inference.
 *
 * @example
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
    props: Omit<EnumOption<T>, 'type' | 'choices'> = {},
  ): EnumOption<T> => ({
    type: 'enum',
    choices,
    ...props,
  }),

  /**
   * Define an array option (--flag value --flag value2).
   */
  array: (
    items: 'string' | 'number',
    props: Omit<ArrayOption, 'type' | 'items'> = {},
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
    items: 'string' | 'number',
    props: Omit<VariadicPositional, 'type' | 'items'> = {},
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
  options: (<A extends OptionsSchema>(a: A) => A) &
    (<A extends OptionsSchema, B extends OptionsSchema>(a: A, b: B) => A & B) &
    (<A extends OptionsSchema, B extends OptionsSchema, C extends OptionsSchema>(
      a: A, b: B, c: C,
    ) => A & B & C) &
    (<A extends OptionsSchema, B extends OptionsSchema, C extends OptionsSchema, D extends OptionsSchema>(
      a: A, b: B, c: C, d: D,
    ) => A & B & C & D) &
    ((...schemas: OptionsSchema[]) => OptionsSchema),

  // ─── Command Builder ───────────────────────────────────────────────

  /**
   * Define a command with proper type inference.
   *
   * @example
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

// Implementation of opt.options (separate for cleaner typing)
(opt as { options: (...schemas: OptionsSchema[]) => OptionsSchema }).options = (
  ...schemas: OptionsSchema[]
): OptionsSchema => {
  const merged = Object.assign({}, ...schemas) as OptionsSchema;
  validateAliasConflicts(merged);
  return merged;
};
```

**Step 2: Write tests for opt.options() alias conflict detection**

```typescript
// test/opt.test.ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { opt } from '../src/opt.js';

describe('opt.options', () => {
  it('merges multiple option schemas', () => {
    const a = opt.options({ foo: opt.string() });
    const b = opt.options({ bar: opt.boolean() });
    const merged = opt.options(a, b);

    assert.ok('foo' in merged);
    assert.ok('bar' in merged);
  });

  it('later schema wins on name conflict', () => {
    const a = opt.options({ name: opt.string({ default: 'a' }) });
    const b = opt.options({ name: opt.string({ default: 'b' }) });
    const merged = opt.options(a, b);

    assert.equal(merged.name.default, 'b');
  });

  it('throws on alias conflict', () => {
    const a = opt.options({ verbose: opt.boolean({ aliases: ['v'] }) });
    const b = opt.options({ version: opt.string({ aliases: ['v'] }) });

    assert.throws(
      () => opt.options(a, b),
      /Alias conflict.*-v.*--verbose.*--version/,
    );
  });

  it('allows same alias on same option name (override)', () => {
    const a = opt.options({ verbose: opt.boolean({ aliases: ['v'], default: false }) });
    const b = opt.options({ verbose: opt.boolean({ aliases: ['v'], default: true }) });

    // Should not throw - same option name can keep its alias
    const merged = opt.options(a, b);
    assert.equal(merged.verbose.default, true);
  });
});
```

**Step 3: Run tests**

Run: `npx vitest run test/opt.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add src/opt.ts test/opt.test.ts
git commit -m "feat: add namespaced opt builder with composition

Provide opt.string(), opt.boolean(), etc. for option definitions.
Add opt.options() for composing multiple schemas with alias conflict
detection. Add opt.command() for defining commands."
```

---

## Part 2: Implement Core Parsing Logic

### Task 3: Create New Parser Module

**Files:**
- Create: `src/parser-new.ts`

**Step 1: Write the failing test for parseSimple**

Create test file first:

```typescript
// test/parser-new.test.ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseSimple } from '../src/parser-new.js';
import { opt } from '../src/opt.js';

describe('parseSimple', () => {
  it('parses string options', async () => {
    const result = await parseSimple({
      options: {
        name: opt.string({ default: 'world' }),
      },
      args: ['--name', 'foo'],
    });

    assert.deepEqual(result.values, { name: 'foo' });
  });

  it('parses boolean options', async () => {
    const result = await parseSimple({
      options: {
        verbose: opt.boolean({ default: false }),
      },
      args: ['--verbose'],
    });

    assert.deepEqual(result.values, { verbose: true });
  });

  it('parses number options', async () => {
    const result = await parseSimple({
      options: {
        count: opt.number({ default: 0 }),
      },
      args: ['--count', '5'],
    });

    assert.deepEqual(result.values, { count: 5 });
  });

  it('applies defaults', async () => {
    const result = await parseSimple({
      options: {
        name: opt.string({ default: 'default-name' }),
        verbose: opt.boolean({ default: false }),
      },
      args: [],
    });

    assert.deepEqual(result.values, { name: 'default-name', verbose: false });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run test/parser-new.test.ts`
Expected: FAIL with "Cannot find module '../src/parser-new.js'"

**Step 3: Write the parseSimple implementation**

```typescript
// src/parser-new.ts
import { parseArgs } from 'node:util';

import type {
  BargsResult,
  InferOptions,
  InferPositionals,
  OptionDef,
  OptionsSchema,
  PositionalDef,
  PositionalsSchema,
} from './types-new.js';

/**
 * Build parseArgs options config from our options schema.
 */
const buildParseArgsConfig = (
  schema: OptionsSchema,
): Record<string, { type: 'boolean' | 'string'; short?: string; multiple?: boolean }> => {
  const config: Record<string, { type: 'boolean' | 'string'; short?: string; multiple?: boolean }> = {};

  for (const [name, def] of Object.entries(schema)) {
    const opt: { type: 'boolean' | 'string'; short?: string; multiple?: boolean } = {
      type: def.type === 'boolean' ? 'boolean' : 'string',
    };

    // First single-char alias becomes short option
    const shortAlias = def.aliases?.find((a) => a.length === 1);
    if (shortAlias) {
      opt.short = shortAlias;
    }

    // Arrays need multiple: true
    if (def.type === 'array') {
      opt.multiple = true;
    }

    config[name] = opt;
  }

  return config;
};

/**
 * Coerce parsed values to their expected types.
 */
const coerceValues = (
  values: Record<string, unknown>,
  schema: OptionsSchema,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};

  for (const [name, def] of Object.entries(schema)) {
    let value = values[name];

    // Apply default if undefined
    if (value === undefined && 'default' in def) {
      value = def.default;
    }

    // Type coercion
    if (value !== undefined) {
      switch (def.type) {
        case 'number':
          result[name] = typeof value === 'string' ? Number(value) : value;
          break;
        case 'array':
          if (def.items === 'number' && Array.isArray(value)) {
            result[name] = value.map((v) => (typeof v === 'string' ? Number(v) : v));
          } else {
            result[name] = value;
          }
          break;
        case 'count':
          // Count options count occurrences
          result[name] = typeof value === 'number' ? value : (value ? 1 : 0);
          break;
        default:
          result[name] = value;
      }
    } else {
      result[name] = value;
    }
  }

  return result;
};

/**
 * Coerce positional values.
 */
const coercePositionals = (
  positionals: string[],
  schema: PositionalsSchema,
): unknown[] => {
  const result: unknown[] = [];

  for (let i = 0; i < schema.length; i++) {
    const def = schema[i];
    const value = positionals[i];

    if (def.type === 'variadic') {
      // Rest of positionals
      const rest = positionals.slice(i);
      if (def.items === 'number') {
        result.push(rest.map(Number));
      } else {
        result.push(rest);
      }
      break;
    }

    if (value !== undefined) {
      if (def.type === 'number') {
        result.push(Number(value));
      } else {
        result.push(value);
      }
    } else if ('default' in def && def.default !== undefined) {
      result.push(def.default);
    } else if (def.required) {
      throw new Error(`Missing required positional argument at position ${i}`);
    } else {
      result.push(undefined);
    }
  }

  return result;
};

/**
 * Options for parseSimple.
 */
interface ParseSimpleOptions<
  TOptions extends OptionsSchema = OptionsSchema,
  TPositionals extends PositionalsSchema = PositionalsSchema,
> {
  options?: TOptions;
  positionals?: TPositionals;
  args?: string[];
}

/**
 * Parse arguments for a simple CLI (no commands).
 */
export const parseSimple = async <
  TOptions extends OptionsSchema = OptionsSchema,
  TPositionals extends PositionalsSchema = PositionalsSchema,
>(
  config: ParseSimpleOptions<TOptions, TPositionals>,
): Promise<
  BargsResult<InferOptions<TOptions>, InferPositionals<TPositionals>, undefined>
> => {
  const {
    options: optionsSchema = {} as TOptions,
    positionals: positionalsSchema = [] as unknown as TPositionals,
    args = process.argv.slice(2),
  } = config;

  // Build parseArgs config
  const parseArgsOptions = buildParseArgsConfig(optionsSchema);

  // Parse with Node.js util.parseArgs
  const { positionals, values } = parseArgs({
    args,
    options: parseArgsOptions,
    strict: true,
    allowPositionals: positionalsSchema.length > 0,
  });

  // Coerce and apply defaults
  const coercedValues = coerceValues(values, optionsSchema);
  const coercedPositionals = coercePositionals(positionals, positionalsSchema);

  return {
    command: undefined,
    positionals: coercedPositionals as InferPositionals<TPositionals>,
    values: coercedValues as InferOptions<TOptions>,
  };
};
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run test/parser-new.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/parser-new.ts test/parser-new.test.ts
git commit -m "feat: add new parseSimple without Zod

Implement argument parsing using explicit option definitions
instead of Zod schema introspection."
```

---

### Task 4: Add Enum and Array Option Support

**Files:**
- Modify: `src/parser-new.ts`
- Modify: `test/parser-new.test.ts`

**Step 1: Write failing tests for enum and array**

Add to `test/parser-new.test.ts`:

```typescript
// Uses opt from existing import

describe('parseSimple', () => {
  // ... existing tests ...

  it('parses enum options', async () => {
    const result = await parseSimple({
      options: {
        level: opt.enum(['low', 'medium', 'high'] as const, { default: 'medium' }),
      },
      args: ['--level', 'high'],
    });

    assert.equal(result.values.level, 'high');
  });

  it('validates enum choices', async () => {
    await assert.rejects(
      parseSimple({
        options: {
          level: opt.enum(['low', 'medium', 'high'] as const),
        },
        args: ['--level', 'invalid'],
      }),
      /Invalid value.*level.*must be one of/,
    );
  });

  it('parses array options', async () => {
    const result = await parseSimple({
      options: {
        files: opt.array('string'),
      },
      args: ['--files', 'a.txt', '--files', 'b.txt'],
    });

    assert.deepEqual(result.values.files, ['a.txt', 'b.txt']);
  });

  it('parses number array options', async () => {
    const result = await parseSimple({
      options: {
        ports: opt.array('number'),
      },
      args: ['--ports', '80', '--ports', '443'],
    });

    assert.deepEqual(result.values.ports, [80, 443]);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run test/parser-new.test.ts`
Expected: FAIL on enum validation test

**Step 3: Add enum validation to coerceValues**

Update the switch statement in `coerceValues`:

```typescript
case 'enum':
  if (value !== undefined && !def.choices.includes(value as string)) {
    throw new Error(
      `Invalid value for --${name}: "${value}". Must be one of: ${def.choices.join(', ')}`,
    );
  }
  result[name] = value;
  break;
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run test/parser-new.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/parser-new.ts test/parser-new.test.ts
git commit -m "feat: add enum validation and array option support"
```

---

### Task 5: Add Positionals Parsing

**Files:**
- Modify: `test/parser-new.test.ts`

**Step 1: Write failing tests for positionals**

```typescript
// Uses opt from existing import

describe('parseSimple positionals', () => {
  it('parses string positionals', async () => {
    const result = await parseSimple({
      positionals: [opt.stringPos({ required: true })],
      args: ['hello'],
    });

    assert.deepEqual(result.positionals, ['hello']);
  });

  it('parses number positionals', async () => {
    const result = await parseSimple({
      positionals: [opt.numberPos({ required: true })],
      args: ['42'],
    });

    assert.deepEqual(result.positionals, [42]);
  });

  it('parses variadic positionals', async () => {
    const result = await parseSimple({
      positionals: [opt.stringPos({ required: true }), opt.variadic('string')],
      args: ['first', 'second', 'third'],
    });

    assert.deepEqual(result.positionals, ['first', ['second', 'third']]);
  });

  it('applies positional defaults', async () => {
    const result = await parseSimple({
      positionals: [opt.stringPos({ default: 'default-value' })],
      args: [],
    });

    assert.deepEqual(result.positionals, ['default-value']);
  });

  it('throws on missing required positional', async () => {
    await assert.rejects(
      parseSimple({
        positionals: [opt.stringPos({ required: true })],
        args: [],
      }),
      /Missing required positional/,
    );
  });
});
```

**Step 2: Run tests to verify they pass (or fail and fix)**

Run: `npx vitest run test/parser-new.test.ts`
Expected: PASS (positionals logic already implemented)

**Step 3: Commit**

```bash
git add test/parser-new.test.ts
git commit -m "test: add positionals parsing tests"
```

---

### Task 6: Implement parseCommands

**Files:**
- Modify: `src/parser-new.ts`
- Create: `test/parser-commands-new.test.ts`

**Step 1: Write failing test for parseCommands**

```typescript
// test/parser-commands-new.test.ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseCommands } from '../src/parser-new.js';
import { opt } from '../src/opt.js';

describe('parseCommands', () => {
  it('parses a command with options', async () => {
    const result = await parseCommands({
      name: 'test-cli',
      options: {
        verbose: opt.boolean({ default: false }),
      },
      commands: {
        greet: opt.command({
          description: 'Greet someone',
          options: {
            name: opt.string({ default: 'world' }),
          },
          handler: () => {},
        }),
      },
      args: ['greet', '--name', 'Alice', '--verbose'],
    });

    assert.equal(result.command, 'greet');
    assert.deepEqual(result.values, { verbose: true, name: 'Alice' });
  });

  it('parses command positionals', async () => {
    const result = await parseCommands({
      name: 'test-cli',
      commands: {
        echo: opt.command({
          description: 'Echo text',
          positionals: [opt.stringPos({ required: true })],
          handler: () => {},
        }),
      },
      args: ['echo', 'hello'],
    });

    assert.equal(result.command, 'echo');
    assert.deepEqual(result.positionals, ['hello']);
  });

  it('calls command handler', async () => {
    let handlerCalled = false;

    await parseCommands({
      name: 'test-cli',
      commands: {
        run: opt.command({
          description: 'Run something',
          handler: () => {
            handlerCalled = true;
          },
        }),
      },
      args: ['run'],
    });

    assert.equal(handlerCalled, true);
  });

  it('uses defaultHandler when no command given', async () => {
    let defaultCalled = false;

    await parseCommands({
      name: 'test-cli',
      commands: {
        run: opt.command({
          description: 'Run something',
          handler: () => {},
        }),
      },
      defaultHandler: () => {
        defaultCalled = true;
      },
      args: [],
    });

    assert.equal(defaultCalled, true);
  });

  it('throws on unknown command', async () => {
    await assert.rejects(
      parseCommands({
        name: 'test-cli',
        commands: {
          run: opt.command({
            description: 'Run something',
            handler: () => {},
          }),
        },
        args: ['unknown'],
      }),
      /Unknown command: unknown/,
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run test/parser-commands-new.test.ts`
Expected: FAIL with "parseCommands is not a function" or similar

**Step 3: Implement parseCommands**

Add to `src/parser-new.ts`:

```typescript
import type {
  AnyCommandConfig,
  BargsConfigWithCommands,
} from './types-new.js';

import { BargsError, HelpError } from './errors.js';

/**
 * Parse arguments for a command-based CLI.
 */
export const parseCommands = async <
  TOptions extends OptionsSchema = OptionsSchema,
  TCommands extends Record<string, AnyCommandConfig> = Record<string, AnyCommandConfig>,
>(
  config: BargsConfigWithCommands<TOptions, PositionalsSchema, TCommands>,
): Promise<BargsResult<InferOptions<TOptions>, unknown[], string | undefined>> => {
  const {
    options: globalOptions = {} as TOptions,
    commands,
    defaultHandler,
    args = process.argv.slice(2),
  } = config;

  const commandsRecord = commands as Record<string, AnyCommandConfig>;

  // Find command name (first non-flag argument)
  const commandIndex = args.findIndex((arg) => !arg.startsWith('-'));
  const commandName = commandIndex >= 0 ? args[commandIndex] : undefined;
  const remainingArgs = commandName
    ? [...args.slice(0, commandIndex), ...args.slice(commandIndex + 1)]
    : args;

  // No command specified
  if (!commandName) {
    if (typeof defaultHandler === 'string') {
      // Use named default command
      return parseCommands({
        ...config,
        args: [defaultHandler, ...args],
        defaultHandler: undefined,
      });
    } else if (typeof defaultHandler === 'function') {
      // Parse global options and call default handler
      const parseArgsOptions = buildParseArgsConfig(globalOptions);
      const { values } = parseArgs({
        args: remainingArgs,
        options: parseArgsOptions,
        strict: true,
        allowPositionals: false,
      });
      const coercedValues = coerceValues(values, globalOptions);

      const result = {
        command: undefined,
        positionals: [] as const,
        values: coercedValues as InferOptions<TOptions>,
      };

      await defaultHandler(result as BargsResult<InferOptions<TOptions>, [], undefined>);
      return result;
    } else {
      throw new HelpError('No command specified.');
    }
  }

  // Find command config
  const command = commandsRecord[commandName];
  if (!command) {
    throw new HelpError(`Unknown command: ${commandName}`);
  }

  // Merge global and command options
  const commandOptions = (command.options ?? {}) as OptionsSchema;
  const mergedOptionsSchema = { ...globalOptions, ...commandOptions };
  const commandPositionals = (command.positionals ?? []) as PositionalsSchema;

  // Build parseArgs config
  const parseArgsOptions = buildParseArgsConfig(mergedOptionsSchema);

  // Parse
  const { positionals, values } = parseArgs({
    args: remainingArgs,
    options: parseArgsOptions,
    strict: true,
    allowPositionals: commandPositionals.length > 0,
  });

  // Coerce
  const coercedValues = coerceValues(values, mergedOptionsSchema);
  const coercedPositionals = coercePositionals(positionals, commandPositionals);

  const result = {
    command: commandName,
    positionals: coercedPositionals,
    values: coercedValues,
  } as BargsResult<InferOptions<TOptions>, unknown[], string>;

  // Call handler
  await command.handler(result as BargsResult<Record<string, unknown>, unknown[], string>);

  return result;
};
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run test/parser-commands-new.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/parser-new.ts test/parser-commands-new.test.ts
git commit -m "feat: add parseCommands for command-based CLIs"
```

---

## Part 3: Implement Help System

### Task 7: Create New Help Generator

**Files:**
- Create: `src/help-new.ts`
- Create: `test/help-new.test.ts`

**Step 1: Write failing test**

```typescript
// test/help-new.test.ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { generateHelp } from '../src/help-new.js';
import { opt } from '../src/opt.js';

describe('generateHelp', () => {
  it('generates help with name and description', () => {
    const help = generateHelp({
      name: 'my-cli',
      description: 'A test CLI',
    });

    assert.ok(help.includes('my-cli'));
    assert.ok(help.includes('A test CLI'));
  });

  it('includes version when provided', () => {
    const help = generateHelp({
      name: 'my-cli',
      version: '1.0.0',
    });

    assert.ok(help.includes('1.0.0'));
  });

  it('lists options with descriptions', () => {
    const help = generateHelp({
      name: 'my-cli',
      options: {
        verbose: opt.boolean({ description: 'Enable verbose output', aliases: ['v'] }),
      },
    });

    assert.ok(help.includes('--verbose'));
    assert.ok(help.includes('-v'));
    assert.ok(help.includes('Enable verbose output'));
    assert.ok(help.includes('[boolean]'));
  });

  it('shows enum choices', () => {
    const help = generateHelp({
      name: 'my-cli',
      options: {
        level: opt.enum(['low', 'medium', 'high'] as const, {
          description: 'Set level',
        }),
      },
    });

    assert.ok(help.includes('low | medium | high'));
  });

  it('shows default values', () => {
    const help = generateHelp({
      name: 'my-cli',
      options: {
        name: opt.string({ default: 'world', description: 'Name to greet' }),
      },
    });

    assert.ok(help.includes('default: "world"'));
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run test/help-new.test.ts`
Expected: FAIL

**Step 3: Implement generateHelp**

```typescript
// src/help-new.ts
import type {
  AnyCommandConfig,
  BargsConfig,
  BargsConfigWithCommands,
  OptionDef,
  OptionsSchema,
} from './types-new.js';

import { bold, cyan, dim, yellow } from './ansi.js';

/**
 * Get type label for help display.
 */
const getTypeLabel = (def: OptionDef): string => {
  switch (def.type) {
    case 'boolean':
      return 'boolean';
    case 'number':
      return 'number';
    case 'string':
      return 'string';
    case 'count':
      return 'count';
    case 'enum':
      return def.choices.join(' | ');
    case 'array':
      return `${def.items}[]`;
    default:
      return 'string';
  }
};

/**
 * Format a single option for help output.
 */
const formatOptionHelp = (name: string, def: OptionDef): string => {
  const parts: string[] = [];

  // Build flag string: -v, --verbose
  const shortAlias = def.aliases?.find((a) => a.length === 1);
  const flagStr = shortAlias ? `-${shortAlias}, --${name}` : `--${name}`;
  parts.push(`  ${bold(flagStr)}`);

  // Pad to align descriptions
  const padding = Math.max(0, 24 - flagStr.length - 2);
  parts.push(' '.repeat(padding));

  // Description
  if (def.description) {
    parts.push(def.description);
  }

  // Type and default
  const typeLabel = getTypeLabel(def);
  const suffixParts = [cyan(`[${typeLabel}]`)];
  if ('default' in def && def.default !== undefined) {
    suffixParts.push(dim(`default: ${JSON.stringify(def.default)}`));
  }

  parts.push('  ', suffixParts.join(' '));

  return parts.join('');
};

/**
 * Check if config has commands.
 */
const hasCommands = (
  config: BargsConfig<OptionsSchema, [], Record<string, AnyCommandConfig> | undefined>,
): config is BargsConfigWithCommands<OptionsSchema, [], Record<string, AnyCommandConfig>> =>
  config.commands !== undefined && Object.keys(config.commands).length > 0;

/**
 * Generate help text for a bargs config.
 */
export const generateHelp = <
  TOptions extends OptionsSchema = OptionsSchema,
  TCommands extends Record<string, AnyCommandConfig> | undefined = undefined,
>(
  config: BargsConfig<TOptions, [], TCommands>,
): string => {
  const lines: string[] = [];

  // Header
  const version = config.version ? ` v${config.version}` : '';
  lines.push('');
  lines.push(`  ${bold(config.name)}${dim(version)}`);
  if (config.description) {
    lines.push(`  ${config.description}`);
  }
  lines.push('');

  // Usage
  lines.push(yellow('USAGE'));
  if (hasCommands(config)) {
    lines.push(`  $ ${config.name} <command> [options]`);
  } else {
    lines.push(`  $ ${config.name} [options]`);
  }
  lines.push('');

  // Commands
  if (hasCommands(config)) {
    lines.push(yellow('COMMANDS'));
    for (const [name, cmd] of Object.entries(config.commands)) {
      const padding = Math.max(0, 14 - name.length);
      lines.push(`  ${bold(name)}${' '.repeat(padding)}${cmd.description}`);
    }
    lines.push('');
  }

  // Options
  if (config.options && Object.keys(config.options).length > 0) {
    // Group options
    const groups = new Map<string, Array<{ name: string; def: OptionDef }>>();
    const ungrouped: Array<{ name: string; def: OptionDef }> = [];

    for (const [name, def] of Object.entries(config.options)) {
      if (def.hidden) continue;

      if (def.group) {
        const group = groups.get(def.group) ?? [];
        group.push({ name, def });
        groups.set(def.group, group);
      } else {
        ungrouped.push({ name, def });
      }
    }

    // Print grouped options
    for (const [groupName, options] of groups) {
      lines.push(yellow(groupName.toUpperCase()));
      for (const opt of options) {
        lines.push(formatOptionHelp(opt.name, opt.def));
      }
      lines.push('');
    }

    // Print ungrouped
    if (ungrouped.length > 0) {
      const label = hasCommands(config) ? 'GLOBAL OPTIONS' : 'OPTIONS';
      lines.push(yellow(label));
      for (const opt of ungrouped) {
        lines.push(formatOptionHelp(opt.name, opt.def));
      }
      lines.push('');
    }
  }

  // Footer
  if (hasCommands(config)) {
    lines.push(dim(`Run '${config.name} <command> --help' for command-specific help.`));
    lines.push('');
  }

  return lines.join('\n');
};

/**
 * Generate help text for a specific command.
 */
export const generateCommandHelp = <
  TOptions extends OptionsSchema = OptionsSchema,
  TCommands extends Record<string, AnyCommandConfig> = Record<string, AnyCommandConfig>,
>(
  config: BargsConfigWithCommands<TOptions, [], TCommands>,
  commandName: string,
): string => {
  const command = config.commands[commandName];
  if (!command) {
    return `Unknown command: ${commandName}`;
  }

  const lines: string[] = [];

  // Header
  lines.push('');
  lines.push(`  ${bold(config.name)} ${bold(commandName)}`);
  lines.push(`  ${command.description}`);
  lines.push('');

  // Usage
  lines.push(yellow('USAGE'));
  lines.push(`  $ ${config.name} ${commandName} [options]`);
  lines.push('');

  // Command options
  if (command.options && Object.keys(command.options).length > 0) {
    lines.push(yellow('OPTIONS'));
    for (const [name, def] of Object.entries(command.options as OptionsSchema)) {
      if (def.hidden) continue;
      lines.push(formatOptionHelp(name, def));
    }
    lines.push('');
  }

  // Global options
  if (config.options && Object.keys(config.options).length > 0) {
    lines.push(yellow('GLOBAL OPTIONS'));
    for (const [name, def] of Object.entries(config.options)) {
      if (def.hidden) continue;
      lines.push(formatOptionHelp(name, def));
    }
    lines.push('');
  }

  return lines.join('\n');
};
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run test/help-new.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/help-new.ts test/help-new.test.ts
git commit -m "feat: add help generator without Zod introspection"
```

---

## Part 4: Create Main Entry Point

### Task 8: Implement New bargs() Function

**Files:**
- Create: `src/bargs-new.ts`
- Create: `test/bargs-new.test.ts`

**Step 1: Write failing test**

```typescript
// test/bargs-new.test.ts
import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

import { bargs } from '../src/bargs-new.js';
import { opt } from '../src/opt.js';

describe('bargs', () => {
  it('parses simple CLI and returns result', async () => {
    const result = await bargs({
      name: 'test-cli',
      options: {
        name: opt.string({ default: 'world' }),
      },
      args: ['--name', 'Alice'],
    });

    assert.deepEqual(result.values, { name: 'Alice' });
  });

  it('calls handler for simple CLI', async () => {
    let handlerResult: unknown = null;

    await bargs({
      name: 'test-cli',
      options: {
        name: opt.string({ default: 'world' }),
      },
      handler: (result) => {
        handlerResult = result;
      },
      args: ['--name', 'Bob'],
    });

    assert.deepEqual((handlerResult as { values: unknown }).values, { name: 'Bob' });
  });

  it('parses command-based CLI', async () => {
    let handlerResult: unknown = null;

    await bargs({
      name: 'test-cli',
      commands: {
        greet: opt.command({
          description: 'Greet someone',
          options: {
            name: opt.string({ default: 'world' }),
          },
          handler: (result) => {
            handlerResult = result;
          },
        }),
      },
      args: ['greet', '--name', 'Charlie'],
    });

    assert.equal((handlerResult as { command: string }).command, 'greet');
    assert.deepEqual((handlerResult as { values: unknown }).values, { name: 'Charlie' });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run test/bargs-new.test.ts`
Expected: FAIL

**Step 3: Implement bargs function**

```typescript
// src/bargs-new.ts
import type {
  AnyCommandConfig,
  BargsConfig,
  BargsConfigWithCommands,
  BargsResult,
  InferOptions,
  InferPositionals,
  OptionsSchema,
  PositionalsSchema,
} from './types-new.js';

import { HelpError, formatZodError } from './errors.js';
import { generateCommandHelp, generateHelp } from './help-new.js';
import { parseCommands, parseSimple } from './parser-new.js';

/**
 * Check if config has commands.
 */
const hasCommands = (
  config: BargsConfig<OptionsSchema, PositionalsSchema, Record<string, AnyCommandConfig> | undefined>,
): config is BargsConfigWithCommands<OptionsSchema, PositionalsSchema, Record<string, AnyCommandConfig>> =>
  config.commands !== undefined && Object.keys(config.commands).length > 0;

/**
 * Main bargs entry point for simple CLIs (no commands).
 */
export async function bargs<
  TOptions extends OptionsSchema,
  TPositionals extends PositionalsSchema,
>(
  config: BargsConfig<TOptions, TPositionals, undefined>,
): Promise<BargsResult<InferOptions<TOptions>, InferPositionals<TPositionals>, undefined>>;

/**
 * Main bargs entry point for command-based CLIs.
 */
export async function bargs<
  TOptions extends OptionsSchema,
  TCommands extends Record<string, AnyCommandConfig>,
>(
  config: BargsConfigWithCommands<TOptions, PositionalsSchema, TCommands>,
): Promise<BargsResult<InferOptions<TOptions>, unknown[], string | undefined>>;

/**
 * Main bargs entry point (implementation).
 */
export async function bargs(
  config: BargsConfig<OptionsSchema, PositionalsSchema, Record<string, AnyCommandConfig> | undefined>,
): Promise<BargsResult<unknown, unknown[], string | undefined>> {
  const args = config.args ?? process.argv.slice(2);

  try {
    // Handle --help
    if (args.includes('--help') || args.includes('-h')) {
      if (hasCommands(config)) {
        // Check for command-specific help: cmd --help
        const helpIndex = args.findIndex((a) => a === '--help' || a === '-h');
        const commandIndex = args.findIndex((a) => !a.startsWith('-'));

        if (commandIndex >= 0 && commandIndex < helpIndex) {
          const commandName = args[commandIndex];
          console.log(generateCommandHelp(config, commandName));
        } else {
          console.log(generateHelp(config));
        }
      } else {
        console.log(generateHelp(config as BargsConfig<OptionsSchema, PositionalsSchema, undefined>));
      }
      process.exit(0);
    }

    // Handle --version
    if (args.includes('--version') && config.version) {
      console.log(config.version);
      process.exit(0);
    }

    // Parse
    if (hasCommands(config)) {
      return await parseCommands({ ...config, args });
    } else {
      const result = await parseSimple({
        options: config.options,
        positionals: config.positionals,
        args,
      });

      // Call handler if provided
      if (config.handler) {
        await config.handler(result as BargsResult<InferOptions<OptionsSchema>, InferPositionals<PositionalsSchema>, undefined>);
      }

      return result;
    }
  } catch (error) {
    if (error instanceof HelpError) {
      console.error(error.message);
      if (hasCommands(config)) {
        console.log(generateHelp(config));
      } else {
        console.log(generateHelp(config as BargsConfig<OptionsSchema, PositionalsSchema, undefined>));
      }
      process.exit(1);
    }
    throw error;
  }
}

// Re-export defineCommand for convenience
export { defineCommand } from './define.js';
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run test/bargs-new.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/bargs-new.ts test/bargs-new.test.ts
git commit -m "feat: add main bargs() entry point without Zod"
```

---

## Part 5: Remove Zod and Clean Up

### Task 9: Remove Zod Dependencies

**Files:**
- Delete: `src/zod-introspection.ts`
- Delete: `src/schema.ts` (the old one)
- Modify: `src/types.ts` → replace with `src/types-new.ts` content
- Modify: `src/parser.ts` → replace with `src/parser-new.ts` content
- Modify: `src/help.ts` → replace with `src/help-new.ts` content
- Modify: `src/index.ts` → replace with `src/bargs-new.ts` content
- Modify: `package.json` → remove zod from dependencies

**Step 1: Remove Zod from package.json**

```bash
npm uninstall zod
```

**Step 2: Replace source files**

```bash
# Backup old files (optional, for reference)
mkdir -p .old-zod-version
cp src/types.ts src/parser.ts src/help.ts src/index.ts src/schema.ts src/zod-introspection.ts .old-zod-version/

# Replace with new implementations
mv src/types-new.ts src/types.ts
mv src/parser-new.ts src/parser.ts
mv src/help-new.ts src/help.ts
mv src/bargs-new.ts src/index.ts

# Remove old Zod-specific files
rm src/schema.ts src/zod-introspection.ts
```

**Step 3: Update exports in index.ts**

Ensure `src/index.ts` exports everything needed:

```typescript
export * from './types.js';
export { opt } from './opt.js';
export * from './errors.js';
export { bargs } from './index.js'; // bargs-new content
export { generateHelp, generateCommandHelp } from './help.js';
```

**Step 4: Run all tests**

Run: `npm test`
Expected: All new tests pass, old tests fail (expected since API changed)

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor!: remove Zod dependency

BREAKING CHANGE: The API now uses explicit option definitions instead
of Zod schemas. See migration guide for details."
```

---

### Task 10: Update Examples

**Files:**
- Modify: `examples/greeter.ts`
- Modify: `examples/tasks.ts`

**Step 1: Update greeter.ts**

```typescript
#!/usr/bin/env npx tsx
import { bargs, opt } from '../src/index.js';

await bargs({
  name: 'greeter',
  version: '1.0.0',
  description: 'A friendly greeter CLI',
  options: {
    greeting: opt.string({ default: 'Hello', description: 'The greeting to use' }),
    name: opt.string({ default: 'World', description: 'Name to greet', aliases: ['n'] }),
    shout: opt.boolean({ default: false, description: 'SHOUT THE GREETING', aliases: ['s'] }),
    verbose: opt.boolean({ default: false, description: 'Show verbose output', aliases: ['v'] }),
  },
  handler: ({ values }) => {
    let message = `${values.greeting}, ${values.name}!`;
    if (values.shout) {
      message = message.toUpperCase();
    }
    console.log(message);
    if (values.verbose) {
      console.log('Options:', values);
    }
  },
});
```

**Step 2: Update tasks.ts**

```typescript
#!/usr/bin/env npx tsx
import { bargs, opt } from '../src/index.js';

interface Task {
  id: number;
  text: string;
  priority: 'low' | 'medium' | 'high';
  done: boolean;
}

const tasks: Task[] = [
  { done: false, id: 1, priority: 'medium', text: 'Example task' },
];

let nextId = 2;

// Reusable global options
const globalOptions = opt.options({
  file: opt.string({ default: 'tasks.json', description: 'Task storage file', aliases: ['f'] }),
  verbose: opt.boolean({ default: false, description: 'Show detailed output', aliases: ['v'] }),
});

await bargs({
  name: 'tasks',
  version: '1.0.0',
  description: 'A simple task manager',
  options: globalOptions,
  commands: {
    add: opt.command({
      description: 'Add a new task',
      options: opt.options(globalOptions, {
        priority: opt.enum(['low', 'medium', 'high'] as const, {
          default: 'medium',
          description: 'Task priority',
          aliases: ['p'],
        }),
      }),
      positionals: [opt.stringPos({ required: true, description: 'Task description' })],
      handler: async ({ positionals, values }) => {
        const [text] = positionals;
        const { priority, verbose } = values;
        const task: Task = { done: false, id: nextId++, priority, text };
        tasks.push(task);
        if (verbose) {
          console.log('Added task:', task);
        } else {
          console.log(`Added task #${task.id}: ${text}`);
        }
      },
    }),
    list: opt.command({
      description: 'List all tasks',
      options: opt.options(globalOptions, {
        all: opt.boolean({ default: false, description: 'Show completed tasks too', aliases: ['a'] }),
      }),
      handler: async ({ values }) => {
        const { all, verbose } = values;
        const filtered = all ? tasks : tasks.filter((t) => !t.done);
        if (filtered.length === 0) {
          console.log('No tasks found');
          return;
        }
        if (verbose) {
          console.log('Tasks:', JSON.stringify(filtered, null, 2));
        } else {
          for (const task of filtered) {
            const status = task.done ? '[x]' : '[ ]';
            const priority = task.priority === 'high' ? '!!!' : task.priority === 'low' ? '.' : '';
            console.log(`${status} #${task.id} ${task.text} ${priority}`);
          }
        }
      },
    }),
    done: opt.command({
      description: 'Mark a task as complete',
      options: globalOptions,
      positionals: [opt.stringPos({ required: true, description: 'Task ID' })],
      handler: async ({ positionals, values }) => {
        const [idStr] = positionals;
        const id = parseInt(idStr, 10);
        const { verbose } = values;
        const task = tasks.find((t) => t.id === id);
        if (!task) {
          console.error(`Task #${id} not found`);
          process.exit(1);
        }
        task.done = true;
        if (verbose) {
          console.log('Completed task:', task);
        } else {
          console.log(`Completed task #${id}: ${task.text}`);
        }
      },
    }),
  },
  defaultHandler: async ({ values }) => {
    const pending = tasks.filter((t) => !t.done).length;
    if (values.verbose) {
      console.log(`Tasks: ${tasks.length} total, ${pending} pending`);
    } else {
      console.log(`${pending} pending task(s)`);
    }
  },
});
```

**Step 3: Run examples to verify they work**

Run: `npx tsx examples/greeter.ts --name Claude`
Expected: "Hello, Claude!"

Run: `npx tsx examples/tasks.ts list`
Expected: Task list output

**Step 4: Commit**

```bash
git add examples/
git commit -m "docs: update examples for new Zod-free API"
```

---

### Task 11: Update/Remove Old Tests

**Files:**
- Delete: `test/schema.test.ts`
- Delete: `test/zod-introspection.test.ts` (if exists)
- Modify: `test/bargs.test.ts` → update for new API
- Modify: `test/parser.test.ts` → update for new API
- Modify: `test/help.test.ts` → update for new API
- Rename: `test/parser-new.test.ts` → `test/parser.test.ts`
- Rename: `test/bargs-new.test.ts` → `test/bargs.test.ts`
- Rename: `test/help-new.test.ts` → `test/help.test.ts`
- Rename: `test/parser-commands-new.test.ts` → `test/parser-commands.test.ts`

**Step 1: Remove old test files and rename new ones**

```bash
rm test/schema.test.ts
rm -f test/zod-introspection.test.ts

# Rename new test files
mv test/parser-new.test.ts test/parser.test.ts
mv test/bargs-new.test.ts test/bargs.test.ts
mv test/help-new.test.ts test/help.test.ts
mv test/parser-commands-new.test.ts test/parser-commands.test.ts
```

**Step 2: Update import paths in test files**

Update each test file to import from the correct paths (without -new suffix).

**Step 3: Run all tests**

Run: `npm test`
Expected: All tests pass

**Step 4: Commit**

```bash
git add -A
git commit -m "test: update test suite for Zod-free API"
```

---

### Task 12: Final Cleanup and Documentation

**Files:**
- Delete: `src/types-new.ts`, `src/parser-new.ts`, `src/help-new.ts`, `src/bargs-new.ts` (if not already moved)
- Delete: `.old-zod-version/` backup directory
- Modify: `README.md` → update API documentation

**Step 1: Remove any leftover temporary files**

```bash
rm -rf .old-zod-version
rm -f src/*-new.ts
rm -f test/*-new.test.ts
```

**Step 2: Run final verification**

Run: `npm run build && npm test`
Expected: Build succeeds, all tests pass

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: final cleanup after Zod removal"
```

---

## Summary

This plan removes Zod and replaces it with an explicit, traditional argument parser API:

**Before (Zod):**
```typescript
import { bargs } from 'bargs';
import { z } from 'zod';

await bargs({
  name: 'my-cli',
  options: z.object({
    name: z.string().default('world').describe('Name to greet'),
    verbose: z.boolean().default(false),
  }),
  handler: ({ values }) => console.log(`Hello, ${values.name}!`),
});
```

**After (No Zod):**
```typescript
import { bargs, opt } from 'bargs';

await bargs({
  name: 'my-cli',
  options: {
    name: opt.string({ default: 'world', description: 'Name to greet' }),
    verbose: opt.boolean({ default: false }),
  },
  handler: ({ values }) => console.log(`Hello, ${values.name}!`),
});
```

**Composition Example:**
```typescript
import { bargs, opt } from 'bargs';

// Reusable option sets
const loggingOptions = opt.options({
  verbose: opt.boolean({ aliases: ['v'] }),
  quiet: opt.boolean({ aliases: ['q'] }),
});

// Compose into command
const processCmd = opt.command({
  description: 'Process files',
  options: opt.options(loggingOptions, {
    format: opt.enum(['json', 'yaml'] as const),
  }),
  handler: ({ values }) => { /* ... */ },
});
```

**Key Changes:**
1. Namespaced `opt` object: `opt.string()`, `opt.boolean()`, `opt.enum()`, etc.
2. `opt.options()` for composing reusable option sets with alias conflict detection
3. `opt.command()` for defining commands with type inference
4. No runtime schema introspection needed
5. Full TypeScript type inference preserved via discriminated unions
6. Zero runtime dependencies (only Node.js built-ins)
