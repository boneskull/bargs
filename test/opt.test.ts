// test/opt.test.ts
import { expect } from 'bupkis';
import { describe, it } from 'node:test';

import { opt } from '../src/opt.js';

describe('opt.options', () => {
  it('merges multiple option schemas', () => {
    const a = opt.options({ foo: opt.string() });
    const b = opt.options({ bar: opt.boolean() });
    const merged = opt.options(a, b);

    expect(merged, 'to satisfy', {
      bar: { type: 'boolean' },
      foo: { type: 'string' },
    });
  });

  it('later schema wins on name conflict', () => {
    const a = opt.options({ name: opt.string({ default: 'a' }) });
    const b = opt.options({ name: opt.string({ default: 'b' }) });
    const merged = opt.options(a, b);

    expect(merged.name.default, 'to be', 'b');
  });

  it('throws on alias conflict', () => {
    const a = opt.options({ verbose: opt.boolean({ aliases: ['v'] }) });
    const b = opt.options({ version: opt.string({ aliases: ['v'] }) });

    expect(
      () => opt.options(a, b),
      'to throw',
      /Alias conflict.*-v.*--verbose.*--version/,
    );
  });

  it('allows same alias on same option name (override)', () => {
    const a = opt.options({
      verbose: opt.boolean({ aliases: ['v'], default: false }),
    });
    const b = opt.options({
      verbose: opt.boolean({ aliases: ['v'], default: true }),
    });

    // Should not throw - same option name can keep its alias
    const merged = opt.options(a, b);
    // Note: When merging options with same key but different literal defaults,
    // TypeScript intersects { default: false } & { default: true } = never.
    // Runtime is correct - later schema wins. Cast to check runtime value.
    expect((merged.verbose as { default?: boolean }).default, 'to be', true);
  });
});

describe('opt.positionals', () => {
  it('creates a positionals schema with single positional', () => {
    const positionals = opt.positionals(
      opt.stringPos({ description: 'Input file', required: true }),
    );

    expect(positionals, 'to satisfy', [{ required: true, type: 'string' }]);
  });

  it('creates a positionals schema with multiple positionals', () => {
    const positionals = opt.positionals(
      opt.stringPos({ description: 'Source', required: true }),
      opt.stringPos({ description: 'Destination' }),
      opt.numberPos({ default: 0 }),
    );

    expect(positionals, 'to satisfy', [
      { type: 'string' },
      { type: 'string' },
      { default: 0, type: 'number' },
    ]);
  });

  it('preserves positional order', () => {
    const positionals = opt.positionals(
      opt.stringPos({ description: 'first' }),
      opt.numberPos({ description: 'second' }),
      opt.variadic('string', { description: 'rest' }),
    );

    expect(positionals, 'to satisfy', [
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

  it('creates count options', () => {
    const option = opt.count({ aliases: ['v'] });

    expect(option, 'to satisfy', { aliases: ['v'], type: 'count' });
  });

  it('creates string positionals', () => {
    const pos = opt.stringPos({ description: 'Input file', required: true });

    expect(pos, 'to satisfy', {
      description: 'Input file',
      required: true,
      type: 'string',
    });
  });

  it('creates number positionals', () => {
    const pos = opt.numberPos({ default: 0 });

    expect(pos, 'to satisfy', { default: 0, type: 'number' });
  });

  it('creates variadic positionals', () => {
    const pos = opt.variadic('string', { description: 'Rest args' });

    expect(pos, 'to satisfy', {
      description: 'Rest args',
      items: 'string',
      type: 'variadic',
    });
  });

  it('creates commands', () => {
    const cmd = opt.command({
      description: 'Test command',
      handler: () => {},
      options: { verbose: opt.boolean() },
    });

    expect(cmd, 'to satisfy', {
      description: 'Test command',
      handler: expect.it('to be a', 'function'),
      options: { verbose: { type: 'boolean' } },
    });
  });
});
