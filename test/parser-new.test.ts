// test/parser-new.test.ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { opt } from '../src/opt.js';
import { parseSimple } from '../src/parser.js';

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

  it('parses short aliases', async () => {
    const result = await parseSimple({
      options: {
        verbose: opt.boolean({ aliases: ['v'] }),
      },
      args: ['-v'],
    });

    assert.deepEqual(result.values, { verbose: true });
  });

  it('returns undefined for options without defaults', async () => {
    const result = await parseSimple({
      options: {
        name: opt.string(),
      },
      args: [],
    });

    assert.equal(result.values.name, undefined);
  });

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
      /Invalid value.*level.*must be one of/i,
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

  it('parses number variadic positionals', async () => {
    const result = await parseSimple({
      positionals: [opt.variadic('number')],
      args: ['1', '2', '3'],
    });

    assert.deepEqual(result.positionals, [[1, 2, 3]]);
  });
});
