/**
 * Tests for option and positional builders.
 */
import { expect } from 'bupkis';
import { describe, it } from 'node:test';

import { opt, pos } from '../src/opt.js';

describe('opt.options', () => {
  it('creates a Parser from options schema', () => {
    const parser = opt.options({
      bar: opt.boolean(),
      foo: opt.string(),
    });

    expect(parser.__brand, 'to be', 'Parser');
    expect(parser.__optionsSchema, 'to satisfy', {
      bar: { type: 'boolean' },
      foo: { type: 'string' },
    });
  });

  it('throws on alias conflict', () => {
    expect(
      () =>
        opt.options({
          verbose: opt.boolean({ aliases: ['v'] }),
          version: opt.string({ aliases: ['v'] }),
        }),
      'to throw',
      /Alias conflict.*-v.*--verbose.*--version/,
    );
  });

  it('throws when alias conflicts with canonical option name', () => {
    expect(
      () =>
        opt.options({
          debug: opt.boolean(),
          verbose: opt.boolean({ aliases: ['debug'] }),
        }),
      'to throw',
      /Alias conflict.*--debug.*conflicts with an existing option name/,
    );
  });

  it('throws when alias conflicts with boolean negation', () => {
    // The alias "no-debug" would conflict with auto-generated --no-debug
    expect(
      () =>
        opt.options({
          debug: opt.boolean(),
          verbose: opt.boolean({ aliases: ['no-debug'] }),
        }),
      'to throw',
      /Alias conflict.*--no-debug.*conflicts with auto-generated boolean negation/,
    );
  });

  it('throws when alias conflicts with own boolean negation', () => {
    // A boolean option's alias "no-op" would conflict with its own --no-op
    expect(
      () =>
        opt.options({
          op: opt.boolean({ aliases: ['no-op'] }),
        }),
      'to throw',
      /Alias conflict.*--no-op.*conflicts with auto-generated boolean negation/,
    );
  });
});

describe('pos.positionals', () => {
  it('creates a Parser from positional definitions', () => {
    const parser = pos.positionals(
      pos.string({ name: 'input', required: true }),
    );

    expect(parser.__brand, 'to be', 'Parser');
    expect(parser.__positionalsSchema, 'to satisfy', [
      { name: 'input', required: true, type: 'string' },
    ]);
  });

  it('creates a Parser with multiple positionals', () => {
    const parser = pos.positionals(
      pos.string({ name: 'source', required: true }),
      pos.string({ name: 'dest' }),
      pos.number({ default: 0, name: 'count' }),
    );

    expect(parser.__positionalsSchema, 'to satisfy', [
      { type: 'string' },
      { type: 'string' },
      { default: 0, type: 'number' },
    ]);
  });

  it('preserves positional order', () => {
    const parser = pos.positionals(
      pos.string({ description: 'first' }),
      pos.number({ description: 'second' }),
      pos.variadic('string', { description: 'rest' }),
    );

    expect(parser.__positionalsSchema, 'to satisfy', [
      { description: 'first' },
      { description: 'second' },
      { description: 'rest' },
    ]);
  });
});

describe('opt builders', () => {
  it('creates string options', () => {
    const option = opt.string({
      default: 'test',
      description: 'A string option',
    });

    expect(option, 'to satisfy', {
      default: 'test',
      description: 'A string option',
      type: 'string',
    });
  });

  it('creates number options', () => {
    const option = opt.number({ default: 42 });

    expect(option, 'to satisfy', { default: 42, type: 'number' });
  });

  it('creates boolean options', () => {
    const option = opt.boolean({ aliases: ['v'], default: false });

    expect(option, 'to satisfy', {
      aliases: ['v'],
      default: false,
      type: 'boolean',
    });
  });

  it('creates enum options', () => {
    const option = opt.enum(['low', 'medium', 'high'] as const, {
      default: 'medium',
    });

    expect(option, 'to satisfy', {
      choices: ['low', 'medium', 'high'],
      default: 'medium',
      type: 'enum',
    });
  });

  it('creates array options', () => {
    const option = opt.array('string', { description: 'Files to process' });

    expect(option, 'to satisfy', {
      description: 'Files to process',
      items: 'string',
      type: 'array',
    });
  });

  it('creates enum array options', () => {
    const option = opt.array(['low', 'medium', 'high'], {
      description: 'Priority levels',
    });

    expect(option, 'to satisfy', {
      choices: ['low', 'medium', 'high'],
      description: 'Priority levels',
      type: 'array',
    });
  });

  it('creates count options', () => {
    const option = opt.count({ aliases: ['v'] });

    expect(option, 'to satisfy', { aliases: ['v'], type: 'count' });
  });
});

describe('pos builders', () => {
  it('creates string positionals', () => {
    const p = pos.string({ description: 'Input file', required: true });

    expect(p, 'to satisfy', {
      description: 'Input file',
      required: true,
      type: 'string',
    });
  });

  it('creates number positionals', () => {
    const p = pos.number({ default: 0 });

    expect(p, 'to satisfy', { default: 0, type: 'number' });
  });

  it('creates enum positionals', () => {
    const p = pos.enum(['a', 'b', 'c'] as const, { name: 'choice' });

    expect(p, 'to satisfy', {
      choices: ['a', 'b', 'c'],
      name: 'choice',
      type: 'enum',
    });
  });

  it('creates variadic positionals', () => {
    const p = pos.variadic('string', { description: 'Rest args' });

    expect(p, 'to satisfy', {
      description: 'Rest args',
      items: 'string',
      type: 'variadic',
    });
  });
});

describe('legacy opt positional builders', () => {
  it('opt.stringPos creates string positionals', () => {
    const p = opt.stringPos({ description: 'Input file', required: true });

    expect(p, 'to satisfy', {
      description: 'Input file',
      required: true,
      type: 'string',
    });
  });

  it('opt.numberPos creates number positionals', () => {
    const p = opt.numberPos({ default: 0 });

    expect(p, 'to satisfy', { default: 0, type: 'number' });
  });

  it('opt.enumPos creates enum positionals', () => {
    const p = opt.enumPos(['a', 'b', 'c'] as const, { name: 'choice' });

    expect(p, 'to satisfy', {
      choices: ['a', 'b', 'c'],
      name: 'choice',
      type: 'enum',
    });
  });

  it('opt.variadic creates variadic positionals', () => {
    const p = opt.variadic('string', { description: 'Rest args' });

    expect(p, 'to satisfy', {
      description: 'Rest args',
      items: 'string',
      type: 'variadic',
    });
  });
});

describe('callable parser merging', () => {
  it('opt.options() as callable merges with existing parser', () => {
    // First create a parser with positionals
    const posParser = pos.positionals(
      pos.string({ name: 'input', required: true }),
    );

    // Use opt.options as callable to merge in options
    const merged = opt.options({ verbose: opt.boolean() })(posParser);

    expect(merged.__brand, 'to be', 'Parser');
    expect(merged.__optionsSchema, 'to satisfy', {
      verbose: { type: 'boolean' },
    });
    expect(merged.__positionalsSchema, 'to satisfy', [
      { name: 'input', type: 'string' },
    ]);
  });

  it('pos.positionals() as callable merges with existing parser', () => {
    // First create a parser with options
    const optParser = opt.options({ verbose: opt.boolean() });

    // Use pos.positionals as callable to merge in positionals
    const merged = pos.positionals(
      pos.string({ name: 'file', required: true }),
    )(optParser);

    expect(merged.__brand, 'to be', 'Parser');
    expect(merged.__optionsSchema, 'to satisfy', {
      verbose: { type: 'boolean' },
    });
    expect(merged.__positionalsSchema, 'to satisfy', [
      { name: 'file', type: 'string' },
    ]);
  });

  it('opt.options() preserves transforms from incoming parser', async () => {
    const { map } = await import('../src/bargs.js');

    // Create a parser with a transform
    const parserWithTransform = map(
      pos.positionals(pos.string({ name: 'input', required: true })),
      ({ positionals, values }) => ({
        positionals: [positionals[0].toUpperCase()] as const,
        values,
      }),
    );

    // Merge with options - should preserve the transform
    const merged = opt.options({ verbose: opt.boolean() })(parserWithTransform);

    // The __transform should be preserved
    const withTransform = merged as typeof merged & {
      __transform?: (r: unknown) => unknown;
    };
    expect(withTransform.__transform, 'to be a', 'function');
  });

  it('pos.positionals() preserves transforms from incoming parser', async () => {
    const { map } = await import('../src/bargs.js');

    // Create a parser with a transform
    const parserWithTransform = map(
      opt.options({ count: opt.number({ default: 1 }) }),
      ({ positionals, values }) => ({
        positionals,
        values: { ...values, doubled: values.count * 2 },
      }),
    );

    // Merge with positionals - should preserve the transform
    const merged = pos.positionals(pos.string({ name: 'file' }))(
      parserWithTransform,
    );

    // The __transform should be preserved
    const withTransform = merged as typeof merged & {
      __transform?: (r: unknown) => unknown;
    };
    expect(withTransform.__transform, 'to be a', 'function');
  });

  it('validates alias conflicts when merging', () => {
    const p1 = opt.options({ verbose: opt.boolean({ aliases: ['v'] }) });

    expect(
      () =>
        opt.options({ version: opt.string({ aliases: ['v'] }) })(
          p1 as ReturnType<typeof opt.options>,
        ),
      'to throw',
      /Alias conflict.*-v/,
    );
  });
});
