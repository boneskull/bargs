// test/parser.test.ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { opt } from '../src/opt.js';
import { parseSimple } from '../src/parser.js';

describe('parseSimple', () => {
  it('parses string options', async () => {
    const result = await parseSimple({
      args: ['--name', 'foo'],
      options: {
        name: opt.string({ default: 'world' }),
      },
    });

    assert.deepEqual(result.values, { name: 'foo' });
  });

  it('parses boolean options', async () => {
    const result = await parseSimple({
      args: ['--verbose'],
      options: {
        verbose: opt.boolean({ default: false }),
      },
    });

    assert.deepEqual(result.values, { verbose: true });
  });

  it('parses number options', async () => {
    const result = await parseSimple({
      args: ['--count', '5'],
      options: {
        count: opt.number({ default: 0 }),
      },
    });

    assert.deepEqual(result.values, { count: 5 });
  });

  it('applies defaults', async () => {
    const result = await parseSimple({
      args: [],
      options: {
        name: opt.string({ default: 'default-name' }),
        verbose: opt.boolean({ default: false }),
      },
    });

    assert.deepEqual(result.values, { name: 'default-name', verbose: false });
  });

  it('parses short aliases', async () => {
    const result = await parseSimple({
      args: ['-v'],
      options: {
        verbose: opt.boolean({ aliases: ['v'] }),
      },
    });

    assert.deepEqual(result.values, { verbose: true });
  });

  it('returns undefined for options without defaults', async () => {
    const result = await parseSimple({
      args: [],
      options: {
        name: opt.string(),
      },
    });

    assert.equal(result.values.name, undefined);
  });

  it('parses enum options', async () => {
    const result = await parseSimple({
      args: ['--level', 'high'],
      options: {
        level: opt.enum(['low', 'medium', 'high'] as const, {
          default: 'medium',
        }),
      },
    });

    assert.equal(result.values.level, 'high');
  });

  it('validates enum choices', async () => {
    await assert.rejects(
      parseSimple({
        args: ['--level', 'invalid'],
        options: {
          level: opt.enum(['low', 'medium', 'high'] as const),
        },
      }),
      /Invalid value.*level.*must be one of/i,
    );
  });

  it('parses array options', async () => {
    const result = await parseSimple({
      args: ['--files', 'a.txt', '--files', 'b.txt'],
      options: {
        files: opt.array('string'),
      },
    });

    assert.deepEqual(result.values.files, ['a.txt', 'b.txt']);
  });

  it('parses number array options', async () => {
    const result = await parseSimple({
      args: ['--ports', '80', '--ports', '443'],
      options: {
        ports: opt.array('number'),
      },
    });

    assert.deepEqual(result.values.ports, [80, 443]);
  });
});

describe('parseSimple positionals', () => {
  it('parses string positionals', async () => {
    const result = await parseSimple({
      args: ['hello'],
      positionals: [opt.stringPos({ required: true })],
    });

    assert.deepEqual(result.positionals, ['hello']);
  });

  it('parses number positionals', async () => {
    const result = await parseSimple({
      args: ['42'],
      positionals: [opt.numberPos({ required: true })],
    });

    assert.deepEqual(result.positionals, [42]);
  });

  it('parses variadic positionals', async () => {
    const result = await parseSimple({
      args: ['first', 'second', 'third'],
      positionals: [opt.stringPos({ required: true }), opt.variadic('string')],
    });

    assert.deepEqual(result.positionals, ['first', ['second', 'third']]);
  });

  it('applies positional defaults', async () => {
    const result = await parseSimple({
      args: [],
      positionals: [opt.stringPos({ default: 'default-value' })],
    });

    assert.deepEqual(result.positionals, ['default-value']);
  });

  it('throws on missing required positional', async () => {
    await assert.rejects(
      parseSimple({
        args: [],
        positionals: [opt.stringPos({ required: true })],
      }),
      /Missing required positional/,
    );
  });

  it('parses number variadic positionals', async () => {
    const result = await parseSimple({
      args: ['1', '2', '3'],
      positionals: [opt.variadic('number')],
    });

    assert.deepEqual(result.positionals, [[1, 2, 3]]);
  });
});
