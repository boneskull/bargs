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
