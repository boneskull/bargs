/**
 * Tests for schema validation.
 */

// ^ Intentional: tests must pass invalid types to test validation
import { expect } from 'bupkis';
import { describe, it } from 'node:test';

import { opt } from '../src/opt.js';
import {
  validateOptionsSchema,
  validatePositionalsSchema,
} from '../src/validate.js';

describe('validateOptionsSchema', () => {
  it('validates option type discriminator', () => {
    expect(
      () =>
        validateOptionsSchema({
          flag: { type: 'invalid' } as any,
        }),
      'to throw a',
      Error,
      'satisfying',
      {
        message: /must be one of/,
        path: 'options.flag.type',
      },
    );

    expect(
      () =>
        validateOptionsSchema({
          flag: {} as any,
        }),
      'to throw a',
      Error,
      'satisfying',
      {
        message: /must be a string/,
        path: 'options.flag.type',
      },
    );
  });

  it('validates string option', () => {
    expect(
      () =>
        validateOptionsSchema({
          name: opt.string({ default: 'world' }),
        }),
      'not to throw',
    );

    expect(
      () =>
        validateOptionsSchema({
          name: { default: 123, type: 'string' } as any,
        }),
      'to throw a',
      Error,
      'satisfying',
      {
        message: /must be a string/,
        path: 'options.name.default',
      },
    );
  });

  it('validates boolean option', () => {
    expect(
      () =>
        validateOptionsSchema({
          verbose: opt.boolean({ default: false }),
        }),
      'not to throw',
    );

    expect(
      () =>
        validateOptionsSchema({
          verbose: { default: 'yes', type: 'boolean' } as any,
        }),
      'to throw a',
      Error,
      'satisfying',
      {
        message: /must be a boolean/,
        path: 'options.verbose.default',
      },
    );
  });

  it('validates number option', () => {
    expect(
      () =>
        validateOptionsSchema({
          count: opt.number({ default: 42 }),
        }),
      'not to throw',
    );

    expect(
      () =>
        validateOptionsSchema({
          count: { default: '42', type: 'number' } as any,
        }),
      'to throw a',
      Error,
      'satisfying',
      {
        message: /must be a number/,
        path: 'options.count.default',
      },
    );
  });

  it('validates count option', () => {
    expect(
      () =>
        validateOptionsSchema({
          verbose: opt.count({ default: 0 }),
        }),
      'not to throw',
    );

    expect(
      () =>
        validateOptionsSchema({
          verbose: { default: 'many', type: 'count' } as any,
        }),
      'to throw a',
      Error,
      'satisfying',
      {
        message: /must be a number/,
        path: 'options.verbose.default',
      },
    );
  });

  it('validates enum option choices', () => {
    expect(
      () =>
        validateOptionsSchema({
          level: opt.enum(['low', 'medium', 'high'] as const),
        }),
      'not to throw',
    );

    expect(
      () =>
        validateOptionsSchema({
          level: { type: 'enum' } as any,
        }),
      'to throw a',
      Error,
      'satisfying',
      {
        message: /must be a non-empty array/,
        path: 'options.level.choices',
      },
    );

    expect(
      () =>
        validateOptionsSchema({
          level: { choices: [], type: 'enum' } as any,
        }),
      'to throw a',
      Error,
      'satisfying',
      {
        message: /must not be empty/,
        path: 'options.level.choices',
      },
    );
  });

  it('validates enum option default is in choices', () => {
    expect(
      () =>
        validateOptionsSchema({
          level: opt.enum(['low', 'medium', 'high'] as const, {
            default: 'medium',
          }),
        }),
      'not to throw',
    );

    expect(
      () =>
        validateOptionsSchema({
          level: {
            choices: ['low', 'medium', 'high'],
            default: 'invalid',
            type: 'enum',
          },
        }),
      'to throw a',
      Error,
      'satisfying',
      {
        message: /must be one of the choices/,
        path: 'options.level.default',
      },
    );
  });

  it('validates array option items', () => {
    expect(
      () =>
        validateOptionsSchema({
          files: opt.array('string'),
          ports: opt.array('number'),
        }),
      'not to throw',
    );

    expect(
      () =>
        validateOptionsSchema({
          files: { items: 'boolean', type: 'array' } as any,
        }),
      'to throw a',
      Error,
      'satisfying',
      {
        message: /"string" or "number"/,
        path: 'options.files.items',
      },
    );
  });

  it('validates array option default matches items type', () => {
    expect(
      () =>
        validateOptionsSchema({
          files: opt.array('string', { default: ['a.txt', 'b.txt'] }),
          ports: opt.array('number', { default: [80, 443] }),
        }),
      'not to throw',
    );

    expect(
      () =>
        validateOptionsSchema({
          files: { default: [1, 2, 3], items: 'string', type: 'array' },
        }),
      'to throw a',
      Error,
      'satisfying',
      {
        message: /must be an array of strings/,
        path: 'options.files.default',
      },
    );

    expect(
      () =>
        validateOptionsSchema({
          ports: { default: ['80', '443'], items: 'number', type: 'array' },
        }),
      'to throw a',
      Error,
      'satisfying',
      {
        message: /must be an array of numbers/,
        path: 'options.ports.default',
      },
    );
  });

  it('validates enum array option choices', () => {
    expect(
      () =>
        validateOptionsSchema({
          priority: opt.array(['low', 'medium', 'high']),
        }),
      'not to throw',
    );
  });

  it('validates enum array option default is in choices', () => {
    expect(
      () =>
        validateOptionsSchema({
          priority: opt.array(['low', 'medium', 'high'], {
            default: ['low', 'high'],
          }),
        }),
      'not to throw',
    );

    expect(
      () =>
        validateOptionsSchema({
          priority: {
            choices: ['low', 'medium', 'high'],
            default: ['invalid'],
            type: 'array',
          },
        }),
      'to throw a',
      Error,
      'satisfying',
      {
        message: /must be one of/,
        path: 'options.priority.default[0]',
      },
    );
  });

  it('validates aliases are single characters', () => {
    expect(
      () =>
        validateOptionsSchema({
          verbose: opt.boolean({ aliases: ['v'] }),
        }),
      'not to throw',
    );

    expect(
      () =>
        validateOptionsSchema({
          verbose: { aliases: ['verbose'], type: 'boolean' },
        }),
      'to throw a',
      Error,
      'satisfying',
      {
        message: /must be a single character/,
        path: 'options.verbose.aliases[0]',
      },
    );
  });

  it('detects duplicate aliases across options', () => {
    expect(
      () =>
        validateOptionsSchema({
          debug: { aliases: ['v'], type: 'boolean' },
          verbose: { aliases: ['v'], type: 'boolean' },
        }),
      'to throw error satisfying',
      // Second option to be validated will fail
      { message: /alias "v" is already used/ },
    );
  });

  it('validates option description is a string', () => {
    expect(
      () =>
        validateOptionsSchema({
          verbose: { description: 123, type: 'boolean' } as any,
        }),
      'to throw a',
      Error,
      'satisfying',
      {
        message: /must be a string/,
        path: 'options.verbose.description',
      },
    );
  });

  it('validates option group is a string', () => {
    expect(
      () =>
        validateOptionsSchema({
          verbose: { group: true, type: 'boolean' } as any,
        }),
      'to throw a',
      Error,
      'satisfying',
      {
        message: /must be a string/,
        path: 'options.verbose.group',
      },
    );
  });

  it('validates option hidden is a boolean', () => {
    expect(
      () =>
        validateOptionsSchema({
          verbose: { hidden: 'yes', type: 'boolean' } as any,
        }),
      'to throw a',
      Error,
      'satisfying',
      {
        message: /must be a boolean/,
        path: 'options.verbose.hidden',
      },
    );
  });

  it('validates option required is a boolean', () => {
    expect(
      () =>
        validateOptionsSchema({
          name: { required: 'yes', type: 'string' } as any,
        }),
      'to throw a',
      Error,
      'satisfying',
      {
        message: /must be a boolean/,
        path: 'options.name.required',
      },
    );
  });
});

describe('validatePositionalsSchema', () => {
  it('validates positionals is an array', () => {
    expect(
      () => validatePositionalsSchema('not-an-array' as any),
      'to throw a',
      Error,
      'satisfying',
      {
        message: /must be an array/,
        path: 'positionals',
      },
    );
  });

  it('validates positional type discriminator', () => {
    expect(
      () => validatePositionalsSchema([{ type: 'invalid' }] as any),
      'to throw a',
      Error,
      'satisfying',
      {
        message: /must be one of/,
        path: 'positionals[0].type',
      },
    );
  });

  it('validates string positional', () => {
    expect(
      () => validatePositionalsSchema([opt.stringPos({ default: 'value' })]),
      'not to throw',
    );

    expect(
      () =>
        validatePositionalsSchema([{ default: 123, type: 'string' }] as any),
      'to throw a',
      Error,
      'satisfying',
      {
        message: /must be a string/,
        path: 'positionals[0].default',
      },
    );
  });

  it('validates number positional', () => {
    expect(
      () => validatePositionalsSchema([opt.numberPos({ default: 42 })]),
      'not to throw',
    );

    expect(
      () =>
        validatePositionalsSchema([{ default: '42', type: 'number' }] as any),
      'to throw a',
      Error,
      'satisfying',
      {
        message: /must be a number/,
        path: 'positionals[0].default',
      },
    );
  });

  it('validates enum positional choices', () => {
    expect(
      () => validatePositionalsSchema([opt.enumPos(['a', 'b', 'c'] as const)]),
      'not to throw',
    );

    expect(
      () => validatePositionalsSchema([{ choices: [], type: 'enum' }] as any),
      'to throw a',
      Error,
      'satisfying',
      {
        message: /must not be empty/,
        path: 'positionals[0].choices',
      },
    );
  });

  it('validates enum positional default is in choices', () => {
    expect(
      () =>
        validatePositionalsSchema([
          { choices: ['a', 'b', 'c'], default: 'd', type: 'enum' },
        ]),
      'to throw a',
      Error,
      'satisfying',
      {
        message: /must be one of the choices/,
        path: 'positionals[0].default',
      },
    );
  });

  it('validates variadic positional items', () => {
    expect(
      () => validatePositionalsSchema([opt.variadic('string')]),
      'not to throw',
    );

    expect(
      () =>
        validatePositionalsSchema([
          { items: 'boolean', type: 'variadic' },
        ] as any),
      'to throw a',
      Error,
      'satisfying',
      {
        message: /"string" or "number"/,
        path: 'positionals[0].items',
      },
    );
  });

  it('validates variadic positional is last', () => {
    expect(
      () =>
        validatePositionalsSchema([opt.variadic('string'), opt.stringPos()]),
      'to throw a',
      Error,
      'satisfying',
      {
        message: /variadic positional must be the last/,
        path: 'positionals[0]',
      },
    );
  });

  it('validates required positionals do not follow optional', () => {
    expect(
      () =>
        validatePositionalsSchema([
          opt.stringPos(), // optional
          opt.stringPos({ required: true }), // required - invalid!
        ]),
      'to throw a',
      Error,
      'satisfying',
      {
        message: /required positional cannot follow an optional/,
        path: 'positionals[1]',
      },
    );
  });

  it('allows optional after required', () => {
    expect(
      () =>
        validatePositionalsSchema([
          opt.stringPos({ required: true }),
          opt.stringPos(), // optional - valid
        ]),
      'not to throw',
    );
  });

  it('validates positional description is a string', () => {
    expect(
      () =>
        validatePositionalsSchema([
          { description: 123, type: 'string' },
        ] as any),
      'to throw a',
      Error,
      'satisfying',
      {
        message: /must be a string/,
        path: 'positionals[0].description',
      },
    );
  });

  it('validates positional name is a string', () => {
    expect(
      () => validatePositionalsSchema([{ name: 123, type: 'string' }] as any),
      'to throw a',
      Error,
      'satisfying',
      {
        message: /must be a string/,
        path: 'positionals[0].name',
      },
    );
  });

  it('validates positional required is a boolean', () => {
    expect(
      () =>
        validatePositionalsSchema([{ required: 'yes', type: 'string' }] as any),
      'to throw a',
      Error,
      'satisfying',
      {
        message: /must be a boolean/,
        path: 'positionals[0].required',
      },
    );
  });
});
