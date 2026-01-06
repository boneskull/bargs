# Transforms Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add yargs-like middleware/transforms that receive parsed values, transform them in a type-safe pipeline, and pass final types to handlers.

**Architecture:** Transforms are defined in config as `{ values?: fn, positionals?: fn }`. They execute after parsing but before handlers. Top-level transforms run first, then command-level. Handler arrays are removed; a single handler receives the final transformed type.

**Tech Stack:** TypeScript 5.x, recursive conditional types, const type parameters, function overloads

---

## Critical Prerequisites

Before starting implementation, the implementing engineer should understand:

1. **The target API** - See `examples/transforms.ts` for the desired end-state
2. **TypeScript inference** - How `const` type parameters preserve literal types
3. **Mapped types vs tuples** - Current `InferPositionals` uses mapped type; must become recursive tuple builder
4. **Existing codebase** - Read `src/types.ts`, `src/bargs.ts`, `src/parser.ts`, `src/opt.ts`

## Type System Design (Tasks 1-5)

The type system is the hard part. Work on types FIRST with stubbed implementations.

---

### Task 1: Define Transform Types in types.ts

**Files:**

- Modify: `src/types.ts:193-201` (after Handler types)

**Step 1: Write the type definitions for transforms**

Add these types after the `HandlerFn` type definition (~line 201):

```typescript
/**
 * Values transform function. Receives parsed values, returns transformed
 * values. The return type becomes the new values type for the handler.
 */
export type ValuesTransformFn<TIn, TOut> = (
  values: TIn,
) => TOut | Promise<TOut>;

/**
 * Positionals transform function. Receives parsed positionals tuple, returns
 * transformed positionals tuple. The return type becomes the new positionals
 * type for the handler.
 */
export type PositionalsTransformFn<
  TIn extends readonly unknown[],
  TOut extends readonly unknown[],
> = (positionals: TIn) => TOut | Promise<TOut>;

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
  /** Transform parsed option values */
  values?: ValuesTransformFn<TValuesIn, TValuesOut>;
  /** Transform parsed positionals tuple */
  positionals?: PositionalsTransformFn<TPositionalsIn, TPositionalsOut>;
}

/**
 * Infer the output values type from a transforms config. If no values
 * transform, output equals input.
 */
export type InferTransformedValues<TValuesIn, TTransforms> =
  TTransforms extends { values: ValuesTransformFn<any, infer TOut> }
    ? TOut
    : TValuesIn;

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
```

**Step 2: Verify syntax by running tsc**

Run: `npx tsc --noEmit src/types.ts`
Expected: No errors (types are standalone)

**Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat(types): add transform type definitions

Add ValuesTransformFn, PositionalsTransformFn, TransformsConfig,
and type inference utilities for transforms feature.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Refactor InferPositionals to Recursive Tuple Type

**Files:**

- Modify: `src/types.ts:273-278`

The current `InferPositionals` uses a mapped type which loses tuple structure. We need a recursive type that builds a proper tuple.

**Step 1: Replace InferPositionals with recursive tuple builder**

Replace lines 273-278 with:

```typescript
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
```

**Step 2: Create a type test file**

Create `test/transforms-types.test.ts`:

```typescript
/**
 * Type-level tests for transforms and InferPositionals refactor. These tests
 * verify types at compile time.
 */
import { describe, test } from 'node:test';
import type {
  InferPositionals,
  PositionalsSchema,
  StringPositional,
  VariadicPositional,
} from '../src/types.js';
import { opt } from '../src/opt.js';

// Type equality check - will fail to compile if types don't match
type Equals<T, U> = [T] extends [U] ? ([U] extends [T] ? true : false) : false;

describe('InferPositionals tuple inference', () => {
  test('single positional produces single-element tuple', () => {
    const schema = [
      { type: 'string', required: true } as StringPositional,
    ] as const;

    type Result = InferPositionals<typeof schema>;
    type Expected = readonly [string];

    const _check: Equals<Result, Expected> = true;
  });

  test('multiple positionals produce ordered tuple', () => {
    const schema = opt.positionals(
      opt.stringPos({ required: true }),
      opt.numberPos({ required: true }),
    );

    type Result = InferPositionals<typeof schema>;
    // Should be [string, number] in order
    type Expected = readonly [string, number];

    const _check: Equals<Result, Expected> = true;
  });

  test('variadic positional produces array element in tuple', () => {
    const schema = opt.positionals(opt.variadic('string', { name: 'files' }));

    type Result = InferPositionals<typeof schema>;
    type Expected = readonly [string[]];

    const _check: Equals<Result, Expected> = true;
  });

  test('mixed positionals with variadic last', () => {
    const schema = [
      { type: 'string', required: true } as StringPositional,
      { type: 'variadic', items: 'string' } as VariadicPositional,
    ] as const;

    type Result = InferPositionals<typeof schema>;
    type Expected = readonly [string, string[]];

    const _check: Equals<Result, Expected> = true;
  });
});
```

**Step 3: Run type check**

Run: `npx tsc --noEmit test/transforms-types.test.ts`
Expected: PASS (no type errors)

**Step 4: Commit**

```bash
git add src/types.ts test/transforms-types.test.ts
git commit -m "refactor(types): make InferPositionals produce proper tuples

Replace mapped type with recursive conditional type that builds
tuples preserving order and length. Add type-level tests.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Update BargsConfig with Transforms Support

**Files:**

- Modify: `src/types.ts:46-71` (BargsConfig interface)

**Step 1: Add transforms property and update handler type**

Replace the BargsConfig interface with:

```typescript
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
  handler?: HandlerFn<
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
  transforms?: TTransforms;
  version?: string;
}
```

**Step 2: Add type test for transforms config**

Append to `test/transforms-types.test.ts`:

```typescript
import type {
  BargsConfig,
  InferOptions,
  TransformsConfig,
  BargsResult,
} from '../src/types.js';
import { bargsAsync } from '../src/index.js';

describe('BargsConfig with transforms', () => {
  test('handler receives transformed values type', () => {
    // This should type-check without errors
    type Config = BargsConfig<
      { verbose: { type: 'boolean'; default: false } },
      readonly [],
      undefined,
      {
        values: (v: { verbose: boolean }) => {
          verbose: boolean;
          extra: string;
        };
      }
    >;

    // The handler should receive the transformed type
    type HandlerParam = Config['handler'] extends
      | ((r: infer R) => any)
      | undefined
      ? R extends BargsResult<infer V, any, any>
        ? V
        : never
      : never;

    type HasExtra = 'extra' extends keyof HandlerParam ? true : false;
    const _check: HasExtra = true;
  });
});
```

**Step 3: Run type check**

Run: `npx tsc --noEmit test/transforms-types.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add src/types.ts test/transforms-types.test.ts
git commit -m "feat(types): add transforms support to BargsConfig

Add TTransforms type parameter and transforms property.
Handler now receives transformed types through pipeline.
Handler arrays removed in favor of single handler.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Update CommandConfig with Transforms Support

**Files:**

- Modify: `src/types.ts:136-162` (CommandConfig and related types)

**Step 1: Update CommandConfig interface**

Replace the CommandConfig interface:

```typescript
/**
 * Command configuration.
 *
 * The handler receives typed local options plus access to global options (as
 * Record<string, unknown>). Global options are available at runtime but require
 * type narrowing to access safely.
 *
 * @typeParam TOptions - Command-specific options schema
 * @typeParam TPositionals - Command positionals schema
 * @typeParam TTransforms - Command-level transforms config
 */
export interface CommandConfig<
  TOptions extends OptionsSchema = OptionsSchema,
  TPositionals extends PositionalsSchema = PositionalsSchema,
  TTransforms extends TransformsConfig<any, any, any, any> | undefined =
    undefined,
> {
  description: string;
  handler: HandlerFn<
    BargsResult<
      InferTransformedValues<
        InferOptions<TOptions> & Record<string, unknown>,
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
 * Command config input type for inline command definitions. The handler type is
 * intentionally loose here - it accepts any result type, allowing commands
 * defined with opt.command() or inline to work.
 */
export interface CommandConfigInput {
  description: string;
  handler: HandlerFn<any>;
  options?: OptionsSchema;
  positionals?: PositionalsSchema;
  transforms?: TransformsConfig<any, any, any, any>;
}

/**
 * Any command config (type-erased for collections). Uses a permissive handler
 * type to avoid variance issues.
 */
export interface AnyCommandConfig {
  description: string;
  handler: (result: any) => Promise<void> | void;
  options?: OptionsSchema;
  positionals?: PositionalsSchema;
  transforms?: TransformsConfig<any, any, any, any>;
}
```

**Step 2: Run type check**

Run: `npx tsc --noEmit src/types.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat(types): add transforms support to CommandConfig

Commands can now have transforms that run after top-level transforms.
Handler arrays removed from command handlers as well.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Update Handler Type and Remove Array Support

**Files:**

- Modify: `src/types.ts:193-201`

**Step 1: Simplify Handler type**

Replace the Handler type:

```typescript
/**
 * Handler function signature. Handler arrays are no longer supported. Use
 * transforms for middleware-like sequential processing.
 *
 * @deprecated Handler arrays - use transforms instead
 */
export type Handler<TResult> = HandlerFn<TResult>;

/**
 * Single handler function signature.
 */
export type HandlerFn<TResult> = (result: TResult) => Promise<void> | void;
```

**Step 2: Update BargsConfigWithCommands**

Update the defaultHandler type in BargsConfigWithCommands (~line 84-98):

```typescript
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
  TTransforms extends TransformsConfig<any, any, any, any> | undefined =
    undefined,
> = Omit<
  BargsConfig<TOptions, PositionalsSchema, TCommands, TTransforms>,
  'handler' | 'positionals'
> & {
  commands: TCommands;
  defaultHandler?:
    | HandlerFn<
        BargsResult<
          InferTransformedValues<InferOptions<TOptions>, TTransforms>,
          readonly [],
          undefined
        >
      >
    | keyof TCommands;
};
```

**Step 3: Run type check**

Run: `npx tsc --noEmit src/types.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add src/types.ts
git commit -m "refactor(types): remove handler array support

Handler arrays are replaced by transforms for sequential processing.
This simplifies the type system and makes the pipeline explicit.

BREAKING CHANGE: Handler arrays no longer supported. Migrate to transforms.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Implementation (Tasks 6-10)

Now implement the runtime behavior to match the types.

---

### Task 6: Update opt.ts Command Builder

**Files:**

- Modify: `src/opt.ts:136-141`

**Step 1: Update opt.command type signature**

Replace the command builder:

````typescript
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
   *   transforms: {
   *     values: (v) => ({ ...v, timestamp: Date.now() }),
   *   },
   *   handler: ({ values }) => {
   *     console.log(`Hello, ${values.name}! (${values.timestamp})`);
   *   },
   * });
   * ```
   */
  command: <
    TOptions extends OptionsSchema = OptionsSchema,
    TPositionals extends PositionalsSchema = PositionalsSchema,
    TTransforms extends TransformsConfig<any, any, any, any> | undefined = undefined,
  >(
    config: CommandConfig<TOptions, TPositionals, TTransforms>,
  ): CommandConfig<TOptions, TPositionals, TTransforms> => config,
````

**Step 2: Add TransformsConfig import**

Add to imports at top of file:

```typescript
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
  TransformsConfig, // ADD THIS
  VariadicPositional,
} from './types.js';
```

**Step 3: Run type check**

Run: `npx tsc --noEmit src/opt.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add src/opt.ts
git commit -m "feat(opt): add transforms support to command builder

opt.command() now accepts transforms config with proper type inference.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: Implement Transform Runners in parser.ts

**Files:**

- Modify: `src/parser.ts:43-69`

**Step 1: Add transform runner functions**

Replace the handler runner functions with transform-aware versions:

```typescript
/**
 * Run transforms synchronously. Throws if any transform returns a thenable.
 */
export const runSyncTransforms = <
  TValuesIn,
  TValuesOut,
  TPositionalsIn extends readonly unknown[],
  TPositionalsOut extends readonly unknown[],
>(
  transforms:
    | TransformsConfig<TValuesIn, TValuesOut, TPositionalsIn, TPositionalsOut>
    | undefined,
  values: TValuesIn,
  positionals: TPositionalsIn,
): { values: TValuesOut; positionals: TPositionalsOut } => {
  let currentValues: unknown = values;
  let currentPositionals: unknown = positionals;

  if (transforms?.values) {
    const result = transforms.values(currentValues as TValuesIn);
    if (isThenable(result)) {
      throw new BargsError(
        'Values transform returned a thenable. Use bargsAsync() for async transforms.',
      );
    }
    currentValues = result;
  }

  if (transforms?.positionals) {
    const result = transforms.positionals(currentPositionals as TPositionalsIn);
    if (isThenable(result)) {
      throw new BargsError(
        'Positionals transform returned a thenable. Use bargsAsync() for async transforms.',
      );
    }
    currentPositionals = result;
  }

  return {
    values: currentValues as TValuesOut,
    positionals: currentPositionals as TPositionalsOut,
  };
};

/**
 * Run transforms asynchronously.
 */
export const runTransforms = async <
  TValuesIn,
  TValuesOut,
  TPositionalsIn extends readonly unknown[],
  TPositionalsOut extends readonly unknown[],
>(
  transforms:
    | TransformsConfig<TValuesIn, TValuesOut, TPositionalsIn, TPositionalsOut>
    | undefined,
  values: TValuesIn,
  positionals: TPositionalsIn,
): Promise<{ values: TValuesOut; positionals: TPositionalsOut }> => {
  let currentValues: unknown = values;
  let currentPositionals: unknown = positionals;

  if (transforms?.values) {
    currentValues = await transforms.values(currentValues as TValuesIn);
  }

  if (transforms?.positionals) {
    currentPositionals = await transforms.positionals(
      currentPositionals as TPositionalsIn,
    );
  }

  return {
    values: currentValues as TValuesOut,
    positionals: currentPositionals as TPositionalsOut,
  };
};

/**
 * Run a single handler synchronously. Throws if handler returns a thenable.
 */
export const runSyncHandler = <T>(handler: HandlerFn<T>, result: T): void => {
  const maybePromise = handler(result);
  if (isThenable(maybePromise)) {
    throw new BargsError(
      'Handler returned a thenable. Use bargsAsync() for async handlers.',
    );
  }
};

/**
 * Run a single handler asynchronously.
 */
export const runHandler = async <T>(
  handler: HandlerFn<T>,
  result: T,
): Promise<void> => {
  await handler(result);
};

// Keep old functions for backwards compatibility during migration
export const runSyncHandlers = runSyncHandler as typeof runSyncHandler;
export const runHandlers = runHandler as typeof runHandler;
```

**Step 2: Add TransformsConfig import**

Update imports at top of file:

```typescript
import type {
  BargsConfigWithCommands,
  BargsResult,
  CommandConfigInput,
  HandlerFn,
  InferOptions,
  InferPositionals,
  OptionsSchema,
  PositionalsSchema,
  TransformsConfig, // ADD THIS
} from './types.js';
```

**Step 3: Run type check**

Run: `npx tsc --noEmit src/parser.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add src/parser.ts
git commit -m "feat(parser): implement transform runners

Add runSyncTransforms and runTransforms for executing transform pipelines.
Refactor handler runners to work with single handlers.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: Update bargs.ts to Execute Transforms

**Files:**

- Modify: `src/bargs.ts`

**Step 1: Import new types and functions**

Update imports:

```typescript
import type {
  BargsConfig,
  BargsConfigWithCommands,
  BargsOptions,
  BargsResult,
  CommandConfigInput,
  HandlerFn,
  InferOptions,
  InferPositionals,
  InferTransformedPositionals,
  InferTransformedValues,
  OptionsSchema,
  PositionalsSchema,
  TransformsConfig,
} from './types.js';

import { HelpError } from './errors.js';
import { generateCommandHelp, generateHelp } from './help.js';
import {
  parseCommandsAsync,
  parseCommandsSync,
  parseSimple,
  runHandler,
  runSyncHandler,
  runSyncTransforms,
  runTransforms,
} from './parser.js';
```

**Step 2: Update bargs function overloads**

Replace the sync bargs overloads (~lines 161-172):

```typescript
/**
 * Main bargs entry point for simple CLIs (no commands) - sync version. Throws
 * if any handler or transform returns a thenable.
 */
export function bargs<
  const TOptions extends OptionsSchema,
  const TPositionals extends PositionalsSchema,
  const TTransforms extends
    | TransformsConfig<
        InferOptions<TOptions>,
        any,
        InferPositionals<TPositionals>,
        any
      >
    | undefined = undefined,
>(
  config: BargsConfig<TOptions, TPositionals, undefined, TTransforms>,
  options?: BargsOptions,
): BargsResult<
  InferTransformedValues<InferOptions<TOptions>, TTransforms>,
  InferTransformedPositionals<InferPositionals<TPositionals>, TTransforms>,
  undefined
>;
```

**Step 3: Update bargs implementation**

Replace the implementation (~lines 189-228):

```typescript
export function bargs(
  config: BargsConfig<
    OptionsSchema,
    PositionalsSchema,
    Record<string, CommandConfigInput> | undefined,
    TransformsConfig<any, any, any, any> | undefined
  >,
  options?: BargsOptions,
): BargsResult<unknown, unknown[], string | undefined> {
  validateConfig(config);

  const args = config.args ?? process.argv.slice(2);
  const theme: Theme = options?.theme
    ? getTheme(options.theme)
    : getTheme('default');

  try {
    handleBuiltinFlags(config, args, theme);

    if (hasCommands(config)) {
      return parseCommandsSync({ ...config, args });
    } else {
      const parsed = parseSimple({
        args,
        options: config.options,
        positionals: config.positionals,
      });

      // Run transforms if present
      const { values, positionals } = config.transforms
        ? runSyncTransforms(
            config.transforms,
            parsed.values,
            parsed.positionals,
          )
        : { values: parsed.values, positionals: parsed.positionals };

      const result = {
        command: undefined,
        positionals,
        values,
      };

      // Call handler if provided
      if (config.handler) {
        runSyncHandler(config.handler, result);
      }

      return result;
    }
  } catch (error) {
    return handleHelpError(error, config, theme);
  }
}
```

**Step 4: Update bargsAsync similarly**

Apply the same pattern to the async versions (~lines 235-299).

**Step 5: Run type check**

Run: `npx tsc --noEmit src/bargs.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/bargs.ts
git commit -m "feat(bargs): execute transforms before handlers

Transforms run after parsing, before handler execution.
Type inference flows through transform pipeline to handler.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 9: Update Command Parsing for Transforms

**Files:**

- Modify: `src/parser.ts:288-433`

**Step 1: Update parseCommandsCore to handle transforms**

Update the command parsing to apply both top-level and command-level transforms:

```typescript
const parseCommandsCore = <
  TOptions extends OptionsSchema = OptionsSchema,
  TCommands extends Record<string, CommandConfigInput> = Record<
    string,
    CommandConfigInput
  >,
>(
  config: BargsConfigWithCommands<
    TOptions,
    TCommands,
    TransformsConfig<any, any, any, any> | undefined
  >,
): ParseCommandsCoreResult<TOptions> => {
  // ... existing parsing logic ...

  // After getting parsed values and positionals, return them for transform execution
  return {
    handler: command.handler,
    result,
    topLevelTransforms: config.transforms,
    commandTransforms: command.transforms,
  };
};
```

Update the interface:

```typescript
interface ParseCommandsCoreResult<TOptions extends OptionsSchema> {
  handler: HandlerFn<unknown> | undefined;
  result: BargsResult<InferOptions<TOptions>, unknown[], string | undefined>;
  topLevelTransforms?: TransformsConfig<any, any, any, any>;
  commandTransforms?: TransformsConfig<any, any, any, any>;
}
```

**Step 2: Update parseCommandsSync**

```typescript
export const parseCommandsSync = <
  TOptions extends OptionsSchema = OptionsSchema,
  TCommands extends Record<string, CommandConfigInput> = Record<
    string,
    CommandConfigInput
  >,
>(
  config: BargsConfigWithCommands<
    TOptions,
    TCommands,
    TransformsConfig<any, any, any, any> | undefined
  >,
): BargsResult<InferOptions<TOptions>, unknown[], string | undefined> => {
  const { handler, result, topLevelTransforms, commandTransforms } =
    parseCommandsCore(config);

  // Apply transforms: top-level first, then command-level
  let currentValues = result.values;
  let currentPositionals = result.positionals;

  if (topLevelTransforms) {
    const transformed = runSyncTransforms(
      topLevelTransforms,
      currentValues,
      currentPositionals,
    );
    currentValues = transformed.values;
    currentPositionals = transformed.positionals;
  }

  if (commandTransforms) {
    const transformed = runSyncTransforms(
      commandTransforms,
      currentValues,
      currentPositionals,
    );
    currentValues = transformed.values;
    currentPositionals = transformed.positionals;
  }

  const finalResult = {
    command: result.command,
    positionals: currentPositionals,
    values: currentValues,
  };

  if (handler) {
    runSyncHandler(handler, finalResult);
  }

  return finalResult as BargsResult<
    InferOptions<TOptions>,
    unknown[],
    string | undefined
  >;
};
```

**Step 3: Update parseCommandsAsync similarly**

**Step 4: Run type check**

Run: `npx tsc --noEmit src/parser.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/parser.ts
git commit -m "feat(parser): apply transforms in command parsing

Top-level transforms execute first, then command-level transforms.
Both sync and async paths updated.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 10: Update Validation for Transforms

**Files:**

- Modify: `src/validate.ts`

**Step 1: Add transform validation function**

Add after handler validation (~line 440):

```typescript
/**
 * Validate a transforms config object.
 */
const validateTransforms = (transforms: unknown, path: string): void => {
  if (transforms === undefined) {
    return; // transforms are optional
  }

  if (!isObject(transforms)) {
    throw new ValidationError(path, 'must be an object');
  }

  if (transforms['values'] !== undefined && !isFunction(transforms['values'])) {
    throw new ValidationError(`${path}.values`, 'must be a function');
  }

  if (
    transforms['positionals'] !== undefined &&
    !isFunction(transforms['positionals'])
  ) {
    throw new ValidationError(`${path}.positionals`, 'must be a function');
  }
};
```

**Step 2: Call validateTransforms in validateSimpleConfig**

```typescript
const validateSimpleConfig = (
  config: Record<string, unknown>,
  path: string,
  _aliases: Map<string, string>,
): void => {
  validatePositionalsSchema(config['positionals'], `${path}.positionals`);
  validateHandler(config['handler'], `${path}.handler`);
  validateTransforms(config['transforms'], `${path}.transforms`);
};
```

**Step 3: Call validateTransforms in validateCommand**

Add to validateCommand after positionals validation:

```typescript
validateTransforms(cmd['transforms'], `${path}.transforms`);
```

**Step 4: Call validateTransforms in validateCommandConfig**

Add to validateCommandConfig:

```typescript
validateTransforms(config['transforms'], `${path}.transforms`);
```

**Step 5: Run validation tests**

Run: `npm test -- test/validate.test.ts`
Expected: Existing tests pass

**Step 6: Add transform validation tests**

Add to `test/validate.test.ts`:

```typescript
describe('transforms validation', () => {
  test('accepts valid transforms object', () => {
    expect(() => {
      validateConfig({
        name: 'test',
        transforms: {
          values: (v) => v,
        },
      });
    }, 'not to throw');
  });

  test('rejects non-function values transform', () => {
    expect(
      () => {
        validateConfig({
          name: 'test',
          transforms: {
            values: 'not a function',
          },
        });
      },
      'to throw',
      /transforms\.values.*must be a function/,
    );
  });

  test('rejects non-function positionals transform', () => {
    expect(
      () => {
        validateConfig({
          name: 'test',
          transforms: {
            positionals: 123,
          },
        });
      },
      'to throw',
      /transforms\.positionals.*must be a function/,
    );
  });
});
```

**Step 7: Run tests**

Run: `npm test -- test/validate.test.ts`
Expected: All tests pass

**Step 8: Commit**

```bash
git add src/validate.ts test/validate.test.ts
git commit -m "feat(validate): add transforms validation

Validate transforms config structure at runtime.
Ensure values and positionals transforms are functions when provided.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Export Updates and Index (Task 11)

---

### Task 11: Update Exports in index.ts

**Files:**

- Modify: `src/index.ts:70-98`

**Step 1: Add transform types to exports**

Add to the type exports:

```typescript
export type {
  AnyCommandConfig,
  ArrayOption,
  BargsConfig,
  BargsConfigWithCommands,
  BargsOptions,
  BargsResult,
  BooleanOption,
  CommandConfig,
  CommandConfigInput,
  CountOption,
  EnumOption,
  Handler,
  HandlerFn,
  InferOption,
  InferOptions,
  InferPositional,
  InferPositionals,
  InferTransformedPositionals, // ADD
  InferTransformedValues, // ADD
  NumberOption,
  NumberPositional,
  OptionDef,
  OptionsSchema,
  PositionalDef,
  PositionalsSchema,
  PositionalsTransformFn, // ADD
  StringOption,
  StringPositional,
  TransformsConfig, // ADD
  ValuesTransformFn, // ADD
  VariadicPositional,
} from './types.js';
```

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat(exports): export transform types

Make TransformsConfig and related types available for consumers.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Testing (Tasks 12-14)

---

### Task 12: Write Unit Tests for Transforms

**Files:**

- Create: `test/transforms.test.ts`

**Step 1: Create comprehensive transform tests**

```typescript
import { describe, test } from 'node:test';
import expect from 'unexpected';

import { bargs, bargsAsync } from '../src/index.js';

describe('transforms', () => {
  describe('values transform', () => {
    test('transforms values before handler', () => {
      let handlerCalled = false;
      let receivedTimestamp: number | undefined;

      bargs({
        name: 'test',
        args: [],
        options: {
          name: bargs.string({ default: 'world' }),
        },
        transforms: {
          values: (v) => ({ ...v, timestamp: 123 }),
        },
        handler: ({ values }) => {
          handlerCalled = true;
          receivedTimestamp = values.timestamp;
        },
      });

      expect(handlerCalled, 'to be true');
      expect(receivedTimestamp, 'to equal', 123);
    });

    test('async values transform works with bargsAsync', async () => {
      let receivedExtra: string | undefined;

      await bargsAsync({
        name: 'test',
        args: [],
        options: {},
        transforms: {
          values: async (v) => {
            await Promise.resolve();
            return { ...v, extra: 'added' };
          },
        },
        handler: ({ values }) => {
          receivedExtra = values.extra;
        },
      });

      expect(receivedExtra, 'to equal', 'added');
    });

    test('sync bargs throws on async transform', () => {
      expect(
        () => {
          bargs({
            name: 'test',
            args: [],
            transforms: {
              values: async (v) => v,
            },
          });
        },
        'to throw',
        /thenable.*Use bargsAsync/,
      );
    });
  });

  describe('positionals transform', () => {
    test('transforms positionals before handler', () => {
      let receivedFiles: string[] | undefined;

      bargs({
        name: 'test',
        args: ['file1.txt', 'file2.txt'],
        positionals: [bargs.variadic('string', { name: 'files' })],
        transforms: {
          positionals: ([files]) =>
            [files.map((f) => f.toUpperCase())] as const,
        },
        handler: ({ positionals }) => {
          receivedFiles = positionals[0];
        },
      });

      expect(receivedFiles, 'to equal', ['FILE1.TXT', 'FILE2.TXT']);
    });
  });

  describe('both transforms', () => {
    test('both values and positionals transforms run', () => {
      let result: { values: unknown; positionals: unknown } | undefined;

      bargs({
        name: 'test',
        args: ['hello'],
        options: {
          count: bargs.number({ default: 0 }),
        },
        positionals: [bargs.stringPos({ required: true })],
        transforms: {
          values: (v) => ({ ...v, doubled: v.count * 2 }),
          positionals: ([msg]) => [msg.toUpperCase()] as const,
        },
        handler: (r) => {
          result = r;
        },
      });

      expect(result?.values, 'to have property', 'doubled', 0);
      expect(result?.positionals, 'to equal', ['HELLO']);
    });
  });

  describe('return value', () => {
    test('bargs returns transformed result', () => {
      const result = bargs({
        name: 'test',
        args: [],
        options: { x: bargs.number({ default: 5 }) },
        transforms: {
          values: (v) => ({ ...v, squared: v.x * v.x }),
        },
      });

      expect(result.values, 'to have property', 'squared', 25);
    });
  });
});
```

**Step 2: Run tests**

Run: `npm test -- test/transforms.test.ts`
Expected: All tests pass

**Step 3: Commit**

```bash
git add test/transforms.test.ts
git commit -m "test: add comprehensive transforms tests

Test values transforms, positionals transforms, sync/async behavior,
and return value transformation.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 13: Write Command Transform Tests

**Files:**

- Modify: `test/transforms.test.ts`

**Step 1: Add command transform tests**

Append to `test/transforms.test.ts`:

```typescript
describe('command transforms', () => {
  test('top-level transforms run before command transforms', async () => {
    const order: string[] = [];

    await bargsAsync({
      name: 'test',
      args: ['cmd'],
      options: {},
      transforms: {
        values: (v) => {
          order.push('top-level');
          return { ...v, topLevel: true };
        },
      },
      commands: {
        cmd: {
          description: 'Test command',
          transforms: {
            values: (v) => {
              order.push('command');
              return { ...v, commandLevel: true };
            },
          },
          handler: ({ values }) => {
            expect(values.topLevel, 'to be true');
            expect(values.commandLevel, 'to be true');
          },
        },
      },
    });

    expect(order, 'to equal', ['top-level', 'command']);
  });

  test('command transforms receive output of top-level transforms', async () => {
    let commandInput: unknown;

    await bargsAsync({
      name: 'test',
      args: ['cmd'],
      transforms: {
        values: () => ({ injected: 'from-top' }),
      },
      commands: {
        cmd: {
          description: 'Test',
          transforms: {
            values: (v) => {
              commandInput = v;
              return v;
            },
          },
          handler: () => {},
        },
      },
    });

    expect(commandInput, 'to have property', 'injected', 'from-top');
  });
});
```

**Step 2: Run tests**

Run: `npm test -- test/transforms.test.ts`
Expected: All tests pass

**Step 3: Commit**

```bash
git add test/transforms.test.ts
git commit -m "test: add command-level transform tests

Verify transform execution order and data flow between levels.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 14: Verify Example File Works

**Files:**

- Verify: `examples/transforms.ts`

**Step 1: Run the example**

Run: `npx tsx examples/transforms.ts --verbose`
Expected: Should run without errors and show verbose output

**Step 2: Run with type checking**

Run: `npx tsc --noEmit examples/transforms.ts`
Expected: No type errors

**Step 3: Verify all examples still work**

Run: `npx tsc --noEmit examples/*.ts`
Expected: No type errors in any example

**Step 4: Commit any example fixes if needed**

If there are type errors in the example, fix them to match the new API.

---

## Migration and Cleanup (Tasks 15-16)

---

### Task 15: Update Existing Tests for Handler Changes

**Files:**

- Modify: `test/bargs.test.ts`
- Modify: `test/parser-commands.test.ts`

Tests that use handler arrays need to be updated. Either:

1. Convert to single handlers
2. Add deprecation/migration tests

**Step 1: Find handler array tests**

Run: `grep -n "handler:.*\[" test/*.ts`

**Step 2: Update tests to use single handlers**

Replace array handlers with single handlers that call multiple functions internally if needed.

**Step 3: Run all tests**

Run: `npm test`
Expected: All tests pass

**Step 4: Commit**

```bash
git add test/
git commit -m "test: update tests for single handler API

Migrate handler array tests to single handler pattern.
Handler arrays are replaced by transforms for sequential processing.

BREAKING CHANGE: Handler arrays no longer supported.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 16: Final Type Check and Build

**Files:**

- All source files

**Step 1: Run full type check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 2: Run full test suite**

Run: `npm test`
Expected: All tests pass

**Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Verify example specifically**

Run: `npx tsx examples/transforms.ts --verbose file1.txt file2.txt`
Expected: Runs correctly (may warn about missing files, that's fine)

**Step 5: Final commit**

```bash
git add .
git commit -m "chore: final cleanup for transforms feature

All types check, tests pass, examples work.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Summary

This plan implements the transforms feature in 16 bite-sized tasks:

**Types First (Tasks 1-5):**

1. Define transform types
2. Refactor InferPositionals to recursive tuple
3. Update BargsConfig with transforms
4. Update CommandConfig with transforms
5. Remove handler array support

**Implementation (Tasks 6-10):** 6. Update opt.ts command builder 7. Implement transform runners 8. Update bargs.ts execution 9. Update command parsing 10. Add validation

**Exports (Task 11):** 11. Export new types

**Testing (Tasks 12-14):** 12. Unit tests for transforms 13. Command transform tests 14. Verify examples

**Cleanup (Tasks 15-16):** 15. Update existing tests 16. Final verification

Each task is self-contained with specific files, code snippets, test commands, and commit messages.
