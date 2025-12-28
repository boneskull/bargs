// test/parser-new.test.ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { opt } from '../src/opt.js';
import { parseSimple } from '../src/parser-new.js';

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
});
