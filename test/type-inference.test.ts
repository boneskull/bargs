/**
 * Type-level tests for option/positional inference.
 *
 * These tests verify that options with defaults infer types WITHOUT undefined,
 * while options without defaults or required:true infer types WITH undefined.
 */
import { describe, test } from 'node:test';

import type {
  InferOption,
  InferOptions,
  InferPositional,
  OptionsSchema,
} from '../src/types.js';

import { opt } from '../src/opt.js';

/**
 * Helper to check if undefined is in a type.
 */
type HasUndefined<T> = undefined extends T ? 'HAS_UNDEFINED' : 'NO_UNDEFINED';

describe('type inference', () => {
  describe('options with defaults should NOT include undefined', () => {
    test('enum with default infers without undefined', () => {
      const _enumOpt = opt.enum(['low', 'medium', 'high'], {
        default: 'medium',
      });
      type Inferred = InferOption<typeof _enumOpt>;
      const _check: HasUndefined<Inferred> = 'NO_UNDEFINED';
    });

    test('string with default infers without undefined', () => {
      const _stringOpt = opt.string({ default: 'hello' });
      type Inferred = InferOption<typeof _stringOpt>;
      const _check: HasUndefined<Inferred> = 'NO_UNDEFINED';
    });

    test('number with default infers without undefined', () => {
      const _numberOpt = opt.number({ default: 42 });
      type Inferred = InferOption<typeof _numberOpt>;
      const _check: HasUndefined<Inferred> = 'NO_UNDEFINED';
    });

    test('boolean with default infers without undefined', () => {
      const _boolOpt = opt.boolean({ default: false });
      type Inferred = InferOption<typeof _boolOpt>;
      const _check: HasUndefined<Inferred> = 'NO_UNDEFINED';
    });
  });

  describe('options without defaults should include undefined', () => {
    test('enum without default infers with undefined', () => {
      const _enumOpt = opt.enum(['low', 'medium', 'high']);
      type Inferred = InferOption<typeof _enumOpt>;
      const _check: HasUndefined<Inferred> = 'HAS_UNDEFINED';
    });

    test('string without default infers with undefined', () => {
      const _stringOpt = opt.string({});
      type Inferred = InferOption<typeof _stringOpt>;
      const _check: HasUndefined<Inferred> = 'HAS_UNDEFINED';
    });

    test('number without default infers with undefined', () => {
      const _numberOpt = opt.number({});
      type Inferred = InferOption<typeof _numberOpt>;
      const _check: HasUndefined<Inferred> = 'HAS_UNDEFINED';
    });

    test('boolean without default infers with undefined', () => {
      const _boolOpt = opt.boolean({});
      type Inferred = InferOption<typeof _boolOpt>;
      const _check: HasUndefined<Inferred> = 'HAS_UNDEFINED';
    });
  });

  describe('InferOptions preserves default info', () => {
    test('schema with mixed defaults infers correctly', () => {
      const _schema = {
        count: opt.number({}),
        level: opt.enum(['low', 'high'], { default: 'low' }),
        name: opt.string({ default: 'world' }),
        verbose: opt.boolean({}),
      } satisfies OptionsSchema;

      type Inferred = InferOptions<typeof _schema>;

      // With default - no undefined
      const _checkName: HasUndefined<Inferred['name']> = 'NO_UNDEFINED';
      const _checkLevel: HasUndefined<Inferred['level']> = 'NO_UNDEFINED';

      // Without default - has undefined
      const _checkCount: HasUndefined<Inferred['count']> = 'HAS_UNDEFINED';
      const _checkVerbose: HasUndefined<Inferred['verbose']> = 'HAS_UNDEFINED';
    });
  });

  describe('enum positional type inference', () => {
    test('enumPos with default infers without undefined', () => {
      const _enumPos = opt.enumPos(['low', 'medium', 'high'], {
        default: 'medium',
      });
      type Inferred = InferPositional<typeof _enumPos>;
      const _check: HasUndefined<Inferred> = 'NO_UNDEFINED';
    });

    test('enumPos without default infers with undefined', () => {
      const _enumPos = opt.enumPos(['low', 'medium', 'high']);
      type Inferred = InferPositional<typeof _enumPos>;
      const _check: HasUndefined<Inferred> = 'HAS_UNDEFINED';
    });

    test('enumPos with required infers without undefined', () => {
      const _enumPos = opt.enumPos(['low', 'medium', 'high'], {
        required: true,
      });
      type Inferred = InferPositional<typeof _enumPos>;
      const _check: HasUndefined<Inferred> = 'NO_UNDEFINED';
    });
  });
});
