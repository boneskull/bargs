// test/bargs.test.ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Theme } from '../src/theme.js';

import { bargs, bargsAsync } from '../src/bargs.js';
import { BargsError } from '../src/errors.js';
import { opt } from '../src/opt.js';

describe('bargs (sync)', () => {
  it('parses simple CLI and returns result', () => {
    const result = bargs({
      args: ['--name', 'Alice'],
      name: 'test-cli',
      options: {
        name: opt.string({ default: 'world' }),
      },
    });

    assert.deepEqual(result.values, { name: 'Alice' });
  });

  it('calls handler for simple CLI', () => {
    let handlerResult: unknown = null;

    bargs({
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

  it('parses command-based CLI', () => {
    let handlerResult: unknown = null;

    bargs({
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

  it('returns result with command undefined for simple CLI', () => {
    const result = bargs({
      args: [],
      name: 'test-cli',
      options: {
        verbose: opt.boolean(),
      },
    });

    assert.equal(result.command, undefined);
  });

  it('applies defaults when no args provided', () => {
    const result = bargs({
      args: [],
      name: 'test-cli',
      options: {
        count: opt.number({ default: 42 }),
        name: opt.string({ default: 'default-name' }),
      },
    });

    assert.deepEqual(result.values, { count: 42, name: 'default-name' });
  });

  it('parses positionals for simple CLI', () => {
    const result = bargs({
      args: ['hello'],
      name: 'test-cli',
      positionals: [opt.stringPos({ required: true })],
    });

    assert.deepEqual(result.positionals, ['hello']);
  });

  it('accepts array of sync handlers for simple CLI', () => {
    const calls: string[] = [];

    bargs({
      args: ['--name', 'Test'],
      handler: [
        () => {
          calls.push('first');
        },
        () => {
          calls.push('second');
        },
        () => {
          calls.push('third');
        },
      ],
      name: 'test-cli',
      options: {
        name: opt.string({ default: 'world' }),
      },
    });

    // Handlers should run in order
    assert.deepEqual(calls, ['first', 'second', 'third']);
  });

  it('accepts array of sync handlers for command', () => {
    const calls: string[] = [];

    bargs({
      args: ['greet'],
      commands: {
        greet: opt.command({
          description: 'Greet',
          handler: [
            () => {
              calls.push('handler-1');
            },
            () => {
              calls.push('handler-2');
            },
          ],
        }),
      },
      name: 'test-cli',
    });

    assert.deepEqual(calls, ['handler-1', 'handler-2']);
  });

  it('throws when sync handler returns a thenable', () => {
    assert.throws(
      () => {
        bargs({
          args: ['--name', 'Test'],
          handler: async () => {
            // Async handler returns a thenable
          },
          name: 'test-cli',
          options: {
            name: opt.string({ default: 'world' }),
          },
        });
      },
      (err: Error) =>
        err instanceof BargsError && err.message.includes('thenable'),
    );
  });

  it('throws when command sync handler returns a thenable', () => {
    assert.throws(
      () => {
        bargs({
          args: ['greet'],
          commands: {
            greet: opt.command({
              description: 'Greet',
              handler: async () => {
                // Async handler
              },
            }),
          },
          name: 'test-cli',
        });
      },
      (err: Error) =>
        err instanceof BargsError && err.message.includes('thenable'),
    );
  });

  it('allows user to override --help with custom option', () => {
    let customHelpCalled = false;

    const result = bargs({
      args: ['--help'],
      handler: () => {
        customHelpCalled = true;
      },
      name: 'test-cli',
      options: {
        help: opt.boolean({ description: 'My custom help' }),
      },
    });

    // Should parse --help as a regular boolean option, not trigger built-in help
    assert.equal(result.values.help, true);
    assert.equal(customHelpCalled, true);
  });

  it('allows user to override -h alias with custom option', () => {
    const result = bargs({
      args: ['-h'],
      name: 'test-cli',
      options: {
        verbose: opt.boolean({ aliases: ['h'] }), // Using 'h' for verbose
      },
    });

    // Should parse -h as verbose, not trigger built-in help
    assert.equal(result.values.verbose, true);
  });

  it('allows user to override --version with custom option', () => {
    const result = bargs({
      args: ['--version'],
      name: 'test-cli',
      options: {
        version: opt.boolean({ description: 'My custom version flag' }),
      },
    });

    // Should parse --version as a regular boolean option
    assert.equal(result.values.version, true);
  });
});

describe('bargsAsync', () => {
  it('parses simple CLI and returns result', async () => {
    const result = await bargsAsync({
      args: ['--name', 'Alice'],
      name: 'test-cli',
      options: {
        name: opt.string({ default: 'world' }),
      },
    });

    assert.deepEqual(result.values, { name: 'Alice' });
  });

  it('calls async handler for simple CLI', async () => {
    let handlerResult: unknown = null;

    await bargsAsync({
      args: ['--name', 'Bob'],
      handler: async (result) => {
        // Simulate async work
        await Promise.resolve();
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

  it('accepts array of async handlers for simple CLI', async () => {
    const calls: string[] = [];

    await bargsAsync({
      args: ['--name', 'Test'],
      handler: [
        () => {
          calls.push('first');
        },
        async () => {
          await Promise.resolve();
          calls.push('second');
        },
        () => {
          calls.push('third');
        },
      ],
      name: 'test-cli',
      options: {
        name: opt.string({ default: 'world' }),
      },
    });

    // Handlers should run in order
    assert.deepEqual(calls, ['first', 'second', 'third']);
  });

  it('accepts array of async handlers for command', async () => {
    const calls: string[] = [];

    await bargsAsync({
      args: ['greet'],
      commands: {
        greet: opt.command({
          description: 'Greet',
          handler: [
            () => {
              calls.push('handler-1');
            },
            async () => {
              await Promise.resolve();
              calls.push('handler-2');
            },
          ],
        }),
      },
      name: 'test-cli',
    });

    assert.deepEqual(calls, ['handler-1', 'handler-2']);
  });
});

describe('bargs with options (second parameter)', () => {
  it('accepts theme by name in options', async () => {
    const result = await bargs(
      {
        args: ['--foo', 'bar'],
        name: 'test',
        options: { foo: { type: 'string' } },
      },
      { theme: 'mono' },
    );
    assert.strictEqual(result.values.foo, 'bar');
  });

  it('accepts custom theme object in options', async () => {
    const customTheme: Theme = {
      colors: {
        command: '',
        defaultValue: '',
        description: '',
        example: '',
        flag: '',
        positional: '',
        scriptName: '\x1b[35m',
        sectionHeader: '',
        type: '',
        usage: '',
      },
    };
    const result = await bargs(
      {
        args: ['--foo', 'bar'],
        name: 'test',
        options: { foo: { type: 'string' } },
      },
      { theme: customTheme },
    );
    assert.strictEqual(result.values.foo, 'bar');
  });

  it('works without options parameter', async () => {
    const result = await bargs({
      args: ['--foo', 'bar'],
      name: 'test',
      options: { foo: { type: 'string' } },
    });
    assert.strictEqual(result.values.foo, 'bar');
  });
});
