/**
 * Type-level tests for transforms and InferPositionals refactor. These tests
 * verify types at compile time - specifically that InferPositionals now
 * produces proper tuples rather than mapped objects.
 */
import { describe, test } from 'node:test';

import type { InferPositionals } from '../src/types.js';

import { opt } from '../src/opt.js';

// Type assignability check - validates types are compatible
type AssertAssignable<_T extends U, U> = true;

// Note: The positional builders (stringPos, numberPos) don't preserve literal types
// for `required: true`, so optional positionals result in `T | undefined`.
// This is consistent with existing behavior - the important thing being tested
// here is that InferPositionals produces proper tuples, not mapped objects.

describe('InferPositionals tuple inference', () => {
  test('single positional produces single-element tuple', () => {
    const _schema = opt.positionals(opt.stringPos({ required: true }));

    type Result = InferPositionals<typeof _schema>;
    // Tuple structure is preserved (length 1, indexed access works)
    type _Check1 = AssertAssignable<Result, readonly [string | undefined]>;
    type _Check2 = AssertAssignable<readonly [string | undefined], Result>;
  });

  test('multiple positionals produce ordered tuple', () => {
    const _schema = opt.positionals(
      opt.stringPos({ required: true }),
      opt.numberPos({ required: true }),
    );

    type Result = InferPositionals<typeof _schema>;
    // Should be a 2-element tuple in order
    type _Check1 = AssertAssignable<
      Result,
      readonly [string | undefined, number | undefined]
    >;
    type _Check2 = AssertAssignable<
      readonly [string | undefined, number | undefined],
      Result
    >;
  });

  test('variadic positional produces array element in tuple', () => {
    const _schema = opt.positionals(opt.variadic('string', { name: 'files' }));

    type Result = InferPositionals<typeof _schema>;
    // Variadic always produces array (not undefined)
    type _Check1 = AssertAssignable<Result, readonly [string[]]>;
    type _Check2 = AssertAssignable<readonly [string[]], Result>;
  });

  test('mixed positionals with variadic last', () => {
    const _schema = opt.positionals(
      opt.stringPos({ required: true }),
      opt.variadic('string', { name: 'files' }),
    );

    type Result = InferPositionals<typeof _schema>;
    // Tuple preserves order: string positional then variadic
    type _Check1 = AssertAssignable<
      Result,
      readonly [string | undefined, string[]]
    >;
    type _Check2 = AssertAssignable<
      readonly [string | undefined, string[]],
      Result
    >;
  });
});
