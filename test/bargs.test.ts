// test/bargs.test.ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { bargs } from '../src/bargs.js';
import { opt } from '../src/opt.js';

describe('bargs', () => {
  it('parses simple CLI and returns result', async () => {
    const result = await bargs({
      args: ['--name', 'Alice'],
      name: 'test-cli',
      options: {
        name: opt.string({ default: 'world' }),
      },
    });

    assert.deepEqual(result.values, { name: 'Alice' });
  });

  it('calls handler for simple CLI', async () => {
    let handlerResult: unknown = null;

    await bargs({
      args: ['--name', 'Bob'],
      handler: (result) => {
        handlerResult = result;
      },
      name: 'test-cli',
      options: {
        name: opt.string({ default: 'world' }),
      },
    });

    assert.deepEqual((handlerResult as { values: unknown }).values, {
      name: 'Bob',
    });
  });

  it('parses command-based CLI', async () => {
    let handlerResult: unknown = null;

    await bargs({
      args: ['greet', '--name', 'Charlie'],
      commands: {
        greet: opt.command({
          description: 'Greet someone',
          handler: (result) => {
            handlerResult = result;
          },
          options: {
            name: opt.string({ default: 'world' }),
          },
        }),
      },
      name: 'test-cli',
    });

    assert.equal((handlerResult as { command: string }).command, 'greet');
    assert.deepEqual((handlerResult as { values: unknown }).values, {
      name: 'Charlie',
    });
  });

  it('returns result with command undefined for simple CLI', async () => {
    const result = await bargs({
      args: [],
      name: 'test-cli',
      options: {
        verbose: opt.boolean(),
      },
    });

    assert.equal(result.command, undefined);
  });

  it('applies defaults when no args provided', async () => {
    const result = await bargs({
      args: [],
      name: 'test-cli',
      options: {
        count: opt.number({ default: 42 }),
        name: opt.string({ default: 'default-name' }),
      },
    });

    assert.deepEqual(result.values, { count: 42, name: 'default-name' });
  });

  it('parses positionals for simple CLI', async () => {
    const result = await bargs({
      args: ['hello'],
      name: 'test-cli',
      positionals: [opt.stringPos({ required: true })],
    });

    assert.deepEqual(result.positionals, ['hello']);
  });
});
