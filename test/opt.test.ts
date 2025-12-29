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
    assert.equal((merged.verbose as { default?: boolean }).default, true);
  });
});

describe('opt.positionals', () => {
  it('creates a positionals schema with single positional', () => {
    const positionals = opt.positionals(
      opt.stringPos({ description: 'Input file', required: true }),
    );

    assert.equal(positionals.length, 1);
    assert.equal(positionals[0].type, 'string');
    assert.equal(positionals[0].required, true);
  });

  it('creates a positionals schema with multiple positionals', () => {
    const positionals = opt.positionals(
      opt.stringPos({ description: 'Source', required: true }),
      opt.stringPos({ description: 'Destination' }),
      opt.numberPos({ default: 0 }),
    );

    assert.equal(positionals.length, 3);
    assert.equal(positionals[0].type, 'string');
    assert.equal(positionals[1].type, 'string');
    assert.equal(positionals[2].type, 'number');
    assert.equal(positionals[2].default, 0);
  });

  it('preserves positional order', () => {
    const positionals = opt.positionals(
      opt.stringPos({ description: 'first' }),
      opt.numberPos({ description: 'second' }),
      opt.variadic('string', { description: 'rest' }),
    );

    assert.equal(positionals[0].description, 'first');
    assert.equal(positionals[1].description, 'second');
    assert.equal(positionals[2].description, 'rest');
  });
});

describe('opt builders', () => {
  it('creates string options', () => {
    const option = opt.string({
      default: 'test',
      description: 'A string option',
    });
    assert.equal(option.type, 'string');
    assert.equal(option.default, 'test');
    assert.equal(option.description, 'A string option');
  });

  it('creates number options', () => {
    const option = opt.number({ default: 42 });
    assert.equal(option.type, 'number');
    assert.equal(option.default, 42);
  });

  it('creates boolean options', () => {
    const option = opt.boolean({ aliases: ['v'], default: false });
    assert.equal(option.type, 'boolean');
    assert.equal(option.default, false);
    assert.deepEqual(option.aliases, ['v']);
  });

  it('creates enum options', () => {
    const option = opt.enum(['low', 'medium', 'high'] as const, {
      default: 'medium',
    });
    assert.equal(option.type, 'enum');
    assert.deepEqual(option.choices, ['low', 'medium', 'high']);
    assert.equal(option.default, 'medium');
  });

  it('creates array options', () => {
    const option = opt.array('string', { description: 'Files to process' });
    assert.equal(option.type, 'array');
    assert.equal(option.items, 'string');
    assert.equal(option.description, 'Files to process');
  });

  it('creates count options', () => {
    const option = opt.count({ aliases: ['v'] });
    assert.equal(option.type, 'count');
    assert.deepEqual(option.aliases, ['v']);
  });

  it('creates string positionals', () => {
    const pos = opt.stringPos({ description: 'Input file', required: true });
    assert.equal(pos.type, 'string');
    assert.equal(pos.required, true);
    assert.equal(pos.description, 'Input file');
  });

  it('creates number positionals', () => {
    const pos = opt.numberPos({ default: 0 });
    assert.equal(pos.type, 'number');
    assert.equal(pos.default, 0);
  });

  it('creates variadic positionals', () => {
    const pos = opt.variadic('string', { description: 'Rest args' });
    assert.equal(pos.type, 'variadic');
    assert.equal(pos.items, 'string');
    assert.equal(pos.description, 'Rest args');
  });

  it('creates commands', () => {
    const cmd = opt.command({
      description: 'Test command',
      handler: () => {},
      options: { verbose: opt.boolean() },
    });
    assert.equal(cmd.description, 'Test command');
    assert.ok('verbose' in cmd.options!);
    assert.equal(typeof cmd.handler, 'function');
  });
});
