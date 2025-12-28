// test/bargs-new.test.ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { bargs } from '../src/bargs-new.js';
import { opt } from '../src/opt.js';

describe('bargs', () => {
  it('parses simple CLI and returns result', async () => {
    const result = await bargs({
      name: 'test-cli',
      options: {
        name: opt.string({ default: 'world' }),
      },
      args: ['--name', 'Alice'],
    });

    assert.deepEqual(result.values, { name: 'Alice' });
  });

  it('calls handler for simple CLI', async () => {
    let handlerResult: unknown = null;

    await bargs({
      name: 'test-cli',
      options: {
        name: opt.string({ default: 'world' }),
      },
      handler: (result) => {
        handlerResult = result;
      },
      args: ['--name', 'Bob'],
    });

    assert.deepEqual((handlerResult as { values: unknown }).values, { name: 'Bob' });
  });

  it('parses command-based CLI', async () => {
    let handlerResult: unknown = null;

    await bargs({
      name: 'test-cli',
      commands: {
        greet: opt.command({
          description: 'Greet someone',
          options: {
            name: opt.string({ default: 'world' }),
          },
          handler: (result) => {
            handlerResult = result;
          },
        }),
      },
      args: ['greet', '--name', 'Charlie'],
    });

    assert.equal((handlerResult as { command: string }).command, 'greet');
    assert.deepEqual((handlerResult as { values: unknown }).values, { name: 'Charlie' });
  });

  it('returns result with command undefined for simple CLI', async () => {
    const result = await bargs({
      name: 'test-cli',
      options: {
        verbose: opt.boolean(),
      },
      args: [],
    });

    assert.equal(result.command, undefined);
  });

  it('applies defaults when no args provided', async () => {
    const result = await bargs({
      name: 'test-cli',
      options: {
        name: opt.string({ default: 'default-name' }),
        count: opt.number({ default: 42 }),
      },
      args: [],
    });

    assert.deepEqual(result.values, { name: 'default-name', count: 42 });
  });

  it('parses positionals for simple CLI', async () => {
    const result = await bargs({
      name: 'test-cli',
      positionals: [opt.stringPos({ required: true })],
      args: ['hello'],
    });

    assert.deepEqual(result.positionals, ['hello']);
  });
});
