/**
 * Tests for the main bargs API.
 */
import { expect } from 'bupkis';
import { describe, it } from 'node:test';

import type { StringOption } from '../src/types.js';

import { bargs, handle, map, merge } from '../src/bargs.js';
import { opt, pos } from '../src/opt.js';
import { withMockedExit } from './helpers/mock-exit.js';

describe('bargs()', () => {
  it('creates a CLI builder', () => {
    const cli = bargs('test-cli');

    expect(cli.globals, 'to be a', 'function');
    expect(cli.command, 'to be a', 'function');
    expect(cli.defaultCommand, 'to be a', 'function');
    expect(cli.parse, 'to be a', 'function');
    expect(cli.parseAsync, 'to be a', 'function');
  });

  it('accepts name and options', () => {
    const cli = bargs('test-cli', {
      description: 'A test CLI',
      version: '1.0.0',
    });

    expect(cli, 'to be defined');
  });

  it('accepts custom theme', () => {
    const cli = bargs('test-cli', { theme: 'mono' });

    expect(cli, 'to be defined');
  });
});

describe('.globals()', () => {
  it('accepts a parser for global options', () => {
    const cli = bargs('test-cli').globals(
      opt.options({ verbose: opt.boolean() }),
    );

    expect(cli.command, 'to be a', 'function');
  });

  it('returns a new builder (immutable)', () => {
    const cli1 = bargs('test-cli');
    const cli2 = cli1.globals(opt.options({ verbose: opt.boolean() }));

    // Should be different objects
    expect(cli1, 'not to be', cli2);
  });
});

describe('.command()', () => {
  it('registers a command', () => {
    const cli = bargs('test-cli').command(
      'greet',
      handle(opt.options({ name: opt.string({ default: 'world' }) }), () => {}),
    );

    expect(cli, 'to be defined');
  });

  it('accepts description as third argument', () => {
    const cli = bargs('test-cli').command(
      'greet',
      handle(opt.options({}), () => {}),
      'Greet someone',
    );

    expect(cli, 'to be defined');
  });

  it('is chainable', () => {
    const cli = bargs('test-cli')
      .command(
        'cmd1',
        handle(opt.options({}), () => {}),
      )
      .command(
        'cmd2',
        handle(opt.options({}), () => {}),
      );

    expect(cli, 'to be defined');
  });
});

describe('.defaultCommand()', () => {
  it('sets the default command', () => {
    const cli = bargs('test-cli')
      .command(
        'greet',
        handle(opt.options({}), () => {}),
      )
      .defaultCommand('greet');

    expect(cli, 'to be defined');
  });
});

describe('.parseAsync()', () => {
  it('parses arguments with global options', async () => {
    const cli = bargs('test-cli').globals(
      opt.options({
        name: opt.string({ default: 'world' }),
        verbose: opt.boolean({ default: false }),
      }),
    );

    const result = await cli.parseAsync(['--verbose', '--name', 'Alice']);

    expect(result.values.verbose, 'to be', true);
    expect(result.values.name, 'to be', 'Alice');
  });

  it('applies defaults when no args provided', async () => {
    const cli = bargs('test-cli').globals(
      opt.options({
        name: opt.string({ default: 'world' }),
        verbose: opt.boolean({ default: false }),
      }),
    );

    const result = await cli.parseAsync([]);

    expect(result.values.verbose, 'to be', false);
    expect(result.values.name, 'to be', 'world');
  });

  it('runs command handler', async () => {
    let handlerCalled = false;
    let handlerResult: unknown;

    const cli = bargs('test-cli').command(
      'greet',
      opt.options({ name: opt.string({ default: 'world' }) }),
      ({ values }) => {
        handlerCalled = true;
        handlerResult = values;
      },
      'Greet someone',
    );

    await cli.parseAsync(['greet', '--name', 'Alice']);

    expect(handlerCalled, 'to be', true);
    expect(handlerResult, 'to satisfy', { name: 'Alice' });
  });

  it('merges global and command options', async () => {
    let handlerResult: unknown;

    const cli = bargs('test-cli')
      .globals(opt.options({ verbose: opt.boolean({ default: false }) }))
      .command(
        'greet',
        opt.options({ name: opt.string({ default: 'world' }) }),
        ({ values }) => {
          handlerResult = values;
        },
      );

    await cli.parseAsync(['greet', '--verbose', '--name', 'Bob']);

    expect(handlerResult, 'to satisfy', {
      name: 'Bob',
      verbose: true,
    });
  });

  it('uses default command when no command specified', async () => {
    let handlerCalled = false;

    const cli = bargs('test-cli')
      .command(
        'greet',
        handle(opt.options({}), () => {
          handlerCalled = true;
        }),
      )
      .defaultCommand('greet');

    await cli.parseAsync([]);

    expect(handlerCalled, 'to be', true);
  });

  it('handles unknown command by showing help and exiting', async () => {
    const cli = bargs('test-cli').command(
      'greet',
      handle(opt.options({}), () => {}),
    );

    const { exitCode, output } = await withMockedExit(() =>
      cli.parseAsync(['unknown']),
    );

    expect(exitCode, 'to equal', 1);
    expect(output, 'to contain', 'Unknown command: unknown');
  });

  it('returns parsed result with command name', async () => {
    const cli = bargs('test-cli').command(
      'greet',
      opt.options({ name: opt.string({ default: 'world' }) }),
      () => {},
    );

    const result = await cli.parseAsync(['greet', '--name', 'Test']);

    expect(result.command, 'to be', 'greet');
    expect(result.values, 'to satisfy', { name: 'Test' });
  });
});

describe('transforms via map()', () => {
  it('applies global transforms', async () => {
    let handlerResult: unknown;

    const cli = bargs('test-cli')
      .globals(
        map(
          opt.options({ name: opt.string({ default: 'world' }) }),
          ({ values }) => ({
            positionals: [] as const,
            values: { ...values, greeting: `Hello, ${values.name}!` },
          }),
        ),
      )
      .command('greet', opt.options({}), ({ values }) => {
        handlerResult = values;
      });

    await cli.parseAsync(['greet', '--name', 'Alice']);

    expect(handlerResult, 'to satisfy', {
      greeting: 'Hello, Alice!',
      name: 'Alice',
    });
  });

  it('applies async transforms', async () => {
    let handlerResult: unknown;

    // Note: For async transforms, we work around the type system limitations
    // by defining the transform separately with explicit typing
    /**
     * @function
     */
    const asyncTransform = (
      parser: ReturnType<
        typeof opt.options<{ name: StringOption & { default: string } }>
      >,
    ) => {
      /**
       * @function
       */
      const transform = async (result: {
        positionals: readonly [];
        values: { name: string };
      }) => {
        // Simulate async operation
        await new Promise((resolve) => setTimeout(resolve, 1));
        return {
          positionals: result.positionals,
          values: { ...result.values, timestamp: Date.now() },
        };
      };
      return { ...parser, __brand: 'Parser' as const, __transform: transform };
    };

    const cli = bargs('test-cli')
      .globals(
        asyncTransform(
          opt.options({ name: opt.string({ default: 'world' }) }),
        ) as unknown as ReturnType<typeof opt.options>,
      )
      .command(
        'greet',
        handle(opt.options({}), ({ values }) => {
          handlerResult = values;
        }),
      );

    await cli.parseAsync(['greet']);

    expect(handlerResult, 'to satisfy', {
      name: 'world',
      timestamp: expect.it('to be a', 'number'),
    });
  });
});

describe('.parse() (sync)', () => {
  it('parses synchronously when no async transforms/handlers', () => {
    const cli = bargs('test-cli').globals(
      opt.options({
        name: opt.string({ default: 'world' }),
      }),
    );

    const result = cli.parse(['--name', 'Alice']);

    expect(result.values.name, 'to be', 'Alice');
  });

  it('throws on async transform', () => {
    const asyncParser = map(
      opt.options({ name: opt.string({ default: 'world' }) }),
      async ({ values }) => {
        await Promise.resolve();
        return { positionals: [] as const, values };
      },
    );

    const cli = bargs('test-cli').globals(asyncParser);

    expect(() => cli.parse([]), 'to throw', /Async.*transform.*Use parseAsync/);
  });

  it('throws on async handler', () => {
    const cli = bargs('test-cli').command(
      'greet',
      handle(opt.options({}), async () => {
        await Promise.resolve();
      }),
    );

    expect(
      () => cli.parse(['greet']),
      'to throw',
      /Async.*handler.*Use parseAsync/,
    );
  });

  it('throws on thenable handler (non-Promise)', () => {
    // A thenable is any object with a .then() method - not necessarily a Promise.
    // This tests that isThenable() correctly detects thenables, not just native Promises.
    const thenable = {
      then(onFulfilled: (value: void) => void) {
        onFulfilled(undefined);
        return this;
      },
    };

    const cli = bargs('test-cli').command(
      'greet',
      handle(opt.options({}), () => thenable as Promise<void>),
    );

    expect(
      () => cli.parse(['greet']),
      'to throw',
      /Async.*handler.*Use parseAsync/,
    );
  });
});

describe('positionals', () => {
  it('parses positional arguments', async () => {
    let handlerResult: unknown;

    const cli = bargs('test-cli').command(
      'echo',
      pos.positionals(pos.string({ name: 'message', required: true })),
      ({ positionals }) => {
        handlerResult = positionals;
      },
    );

    await cli.parseAsync(['echo', 'Hello, world!']);

    expect(handlerResult, 'to satisfy', ['Hello, world!']);
  });

  it('handles multiple positionals', async () => {
    let handlerResult: unknown;

    const cli = bargs('test-cli').command(
      'copy',
      pos.positionals(
        pos.string({ name: 'source', required: true }),
        pos.string({ name: 'dest', required: true }),
      ),
      ({ positionals }) => {
        handlerResult = positionals;
      },
    );

    await cli.parseAsync(['copy', 'src.txt', 'dst.txt']);

    expect(handlerResult, 'to satisfy', ['src.txt', 'dst.txt']);
  });

  it('handles variadic positionals', async () => {
    let handlerResult: unknown;

    const cli = bargs('test-cli').command(
      'concat',
      pos.positionals(pos.variadic('string', { name: 'files' })),
      ({ positionals }) => {
        handlerResult = positionals;
      },
    );

    await cli.parseAsync(['concat', 'a.txt', 'b.txt', 'c.txt']);

    expect(handlerResult, 'to satisfy', [['a.txt', 'b.txt', 'c.txt']]);
  });
});

describe('nested commands via factory pattern', () => {
  it('supports nested commands via factory function', async () => {
    let result: unknown;

    const cli = bargs('git').command(
      'remote',
      (remote) =>
        remote.command(
          'add',
          pos.positionals(
            pos.string({ name: 'name', required: true }),
            pos.string({ name: 'url', required: true }),
          ),
          ({ positionals }) => {
            result = { command: 'remote add', positionals };
          },
          'Add a remote',
        ),
      'Manage remotes',
    );

    await cli.parseAsync(['remote', 'add', 'origin', 'https://github.com/...']);

    expect(result, 'to satisfy', {
      command: 'remote add',
      positionals: ['origin', 'https://github.com/...'],
    });
  });

  it('passes parent globals to factory-created nested command handlers', async () => {
    let result: unknown;

    const cli = bargs('git')
      .globals(opt.options({ verbose: opt.boolean({ aliases: ['v'] }) }))
      .command('remote', (remote) =>
        remote.command(
          'add',
          pos.positionals(pos.string({ name: 'name', required: true })),
          ({ positionals, values }) => {
            result = { positionals, values };
          },
        ),
      );

    await cli.parseAsync(['--verbose', 'remote', 'add', 'origin']);

    expect(result, 'to satisfy', {
      positionals: ['origin'],
      values: { verbose: true },
    });
  });

  it('supports deeply nested commands via factory', async () => {
    let result: unknown;

    const cli = bargs('git').command('remote', (remote) =>
      remote.command('origin', (origin) =>
        origin.command(
          'set',
          pos.positionals(pos.string({ name: 'url', required: true })),
          ({ positionals }) => {
            result = { command: 'remote origin set', positionals };
          },
        ),
      ),
    );

    await cli.parseAsync(['remote', 'origin', 'set', 'https://new.url']);

    expect(result, 'to satisfy', {
      command: 'remote origin set',
      positionals: ['https://new.url'],
    });
  });

  it('supports default subcommand in factory-created nested commands', async () => {
    let result: unknown;

    const cli = bargs('git').command('remote', (remote) =>
      remote
        .command(
          'list',
          opt.options({}),
          () => {
            result = 'list called';
          },
          'List remotes',
        )
        .command('add', opt.options({}), () => {
          result = 'add called';
        })
        .defaultCommand('list'),
    );

    await cli.parseAsync(['remote']);

    expect(result, 'to be', 'list called');
  });

  it('merges command-local options with parent globals in factory', async () => {
    let result: unknown;

    const cli = bargs('git')
      .globals(opt.options({ verbose: opt.boolean() }))
      .command('remote', (remote) =>
        remote.command(
          'add',
          opt.options({ force: opt.boolean() }),
          ({ values }) => {
            result = values;
          },
        ),
      );

    await cli.parseAsync(['--verbose', 'remote', 'add', '--force']);

    expect(result, 'to satisfy', {
      force: true,
      verbose: true,
    });
  });

  it('merges nested .globals() with parent globals in factory', async () => {
    let result: unknown;

    // This tests the pattern:
    //   .globals(globalOptions)  // verbose
    //   .command('history', (history) =>
    //     history.globals(quietOption)  // quiet - should MERGE with parent globals
    //       .command('list', ...)
    //   )
    const cli = bargs('main')
      .globals(opt.options({ verbose: opt.boolean() }))
      .command('history', (history) =>
        history
          .globals(opt.options({ quiet: opt.boolean() }))
          .command(
            'list',
            opt.options({ limit: opt.number() }),
            ({ values }) => {
              result = values;
            },
          ),
      );

    await cli.parseAsync([
      '--verbose',
      'history',
      '--quiet',
      'list',
      '--limit',
      '10',
    ]);

    expect(result, 'to satisfy', {
      limit: 10,
      quiet: true,
      verbose: true,
    });
  });
});

describe('command aliases', () => {
  describe('leaf commands', () => {
    it('resolves alias to canonical command (string alias)', async () => {
      let executed = false;
      const cli = bargs('test-cli').command(
        'add',
        opt.options({}),
        () => {
          executed = true;
        },
        { aliases: ['a', 'new'], description: 'Add an item' },
      );

      await cli.parseAsync(['a']);
      expect(executed, 'to be', true);
    });

    it('resolves multiple aliases', async () => {
      const calls: string[] = [];
      const cli = bargs('test-cli').command(
        'list',
        opt.options({}),
        () => {
          calls.push('list');
        },
        { aliases: ['ls', 'l'], description: 'List items' },
      );

      await cli.parseAsync(['ls']);
      await cli.parseAsync(['l']);
      await cli.parseAsync(['list']);

      expect(calls, 'to have length', 3);
    });

    it('passes options through when using alias', async () => {
      let result: unknown;
      const cli = bargs('test-cli')
        .globals(opt.options({ verbose: opt.boolean() }))
        .command(
          'remove',
          opt.options({ force: opt.boolean() }),
          ({ values }) => {
            result = values;
          },
          { aliases: ['rm', 'del'] },
        );

      await cli.parseAsync(['--verbose', 'rm', '--force']);

      expect(result, 'to satisfy', {
        force: true,
        verbose: true,
      });
    });

    it('allows description-only string (backward compatible)', async () => {
      let executed = false;
      const cli = bargs('test-cli').command(
        'greet',
        opt.options({}),
        () => {
          executed = true;
        },
        'Say hello', // string description, no aliases
      );

      await cli.parseAsync(['greet']);
      expect(executed, 'to be', true);
    });
  });

  describe('nested commands', () => {
    it('resolves alias for nested command group', async () => {
      let executed = false;
      const cli = bargs('test-cli').command(
        'remote',
        (remote) =>
          remote.command(
            'add',
            opt.options({}),
            () => {
              executed = true;
            },
            'Add remote',
          ),
        { aliases: ['r'], description: 'Manage remotes' },
      );

      await cli.parseAsync(['r', 'add']);
      expect(executed, 'to be', true);
    });

    it('resolves aliases at multiple levels', async () => {
      let result: unknown;
      const cli = bargs('test-cli')
        .globals(opt.options({ verbose: opt.boolean() }))
        .command(
          'config',
          (cfg) =>
            cfg.command(
              'get',
              pos.positionals(pos.string({ name: 'key', required: true })),
              ({ positionals, values }) => {
                result = { key: positionals[0], values };
              },
              { aliases: ['g'] },
            ),
          { aliases: ['cfg', 'c'] },
        );

      await cli.parseAsync(['--verbose', 'c', 'g', 'user.name']);

      expect(result, 'to satisfy', {
        key: 'user.name',
        values: { verbose: true },
      });
    });
  });

  describe('error handling', () => {
    it('throws BargsError when alias conflicts with existing command', () => {
      expect(
        () =>
          bargs('test-cli')
            .command('add', opt.options({}), () => {}, { aliases: ['a'] })
            .command(
              'append',
              opt.options({}),
              () => {},
              { aliases: ['a'] }, // Conflict!
            ),
        'to throw',
        /alias "a" is already registered/,
      );
    });

    it('throws BargsError when alias conflicts with command name', () => {
      expect(
        () =>
          bargs('test-cli')
            .command('add', opt.options({}), () => {})
            .command(
              'append',
              opt.options({}),
              () => {},
              { aliases: ['add'] }, // Conflict with command name!
            ),
        'to throw',
        /alias "add" conflicts with existing command name/,
      );
    });
  });
});

describe('merge() edge cases', () => {
  it('throws when called with no parsers', () => {
    expect(
      // @ts-expect-error testing runtime behavior
      () => merge(),
      'to throw',
      /merge\(\) requires at least one parser/,
    );
  });

  it('chains transforms from both parsers', async () => {
    // First parser with a transform
    const p1 = map(
      opt.options({ x: opt.number({ default: 1 }) }),
      ({ values }) => ({
        positionals: [] as const,
        values: { ...values, doubled: values.x * 2 },
      }),
    );

    // Second parser with a transform
    const p2 = map(
      opt.options({ y: opt.number({ default: 2 }) }),
      ({ values }) => ({
        positionals: [] as const,
        values: { ...values, tripled: values.y * 3 },
      }),
    );

    // Merge preserves transforms (though behavior depends on implementation)
    const merged = merge(p1, p2);

    expect(merged.__brand, 'to be', 'Parser');
    expect(merged.__optionsSchema, 'to satisfy', {
      x: { type: 'number' },
      y: { type: 'number' },
    });
  });

  it('merges four parsers', () => {
    const p1 = opt.options({ a: opt.boolean() });
    const p2 = opt.options({ b: opt.string() });
    const p3 = opt.options({ c: opt.number() });
    const p4 = pos.positionals(pos.string({ name: 'file' }));

    const merged = merge(p1, p2, p3, p4);

    expect(merged.__optionsSchema, 'to satisfy', {
      a: { type: 'boolean' },
      b: { type: 'string' },
      c: { type: 'number' },
    });
    expect(merged.__positionalsSchema, 'to have length', 1);
  });
});

describe('error paths', () => {
  describe('HelpError handling', () => {
    it('handles no command by displaying help and exiting', async () => {
      const cli = bargs('test-cli')
        .command(
          'run',
          handle(opt.options({}), () => {}),
        )
        .command(
          'build',
          handle(opt.options({}), () => {}),
        );

      const { exitCode, output } = await withMockedExit(() =>
        cli.parseAsync([]),
      );

      // Verify process exits with code 1
      expect(exitCode, 'to equal', 1);

      // Verify error message was shown
      expect(output, 'to contain', 'No command specified');

      // Verify help was displayed
      expect(output, 'to contain', 'USAGE');
      expect(output, 'to contain', 'COMMANDS');
    });

    it('handles unknown command by displaying help and exiting', async () => {
      const cli = bargs('test-cli').command(
        'run',
        handle(opt.options({}), () => {}),
      );

      const { exitCode, output } = await withMockedExit(() =>
        cli.parseAsync(['unknown-command']),
      );

      expect(exitCode, 'to equal', 1);
      expect(output, 'to contain', 'Unknown command: unknown-command');
      expect(output, 'to contain', 'USAGE');
    });

    it('handles HelpError in sync parse() as well', async () => {
      const cli = bargs('test-cli').command(
        'run',
        handle(opt.options({}), () => {}),
      );

      const { exitCode, output } = await withMockedExit(() => cli.parse([]));

      expect(exitCode, 'to equal', 1);
      expect(output, 'to contain', 'No command specified');
    });
  });

  it('handles async global transform in nested commands', async () => {
    let result: unknown;

    const cli = bargs('test-cli')
      .globals(
        map(opt.options({ verbose: opt.boolean() }), async ({ values }) => {
          await new Promise((resolve) => setTimeout(resolve, 1));
          return { positionals: [] as const, values: { ...values, ts: 123 } };
        }),
      )
      .command('parent', (parent) =>
        parent.command('child', opt.options({}), ({ values }) => {
          result = values;
        }),
      );

    await cli.parseAsync(['--verbose', 'parent', 'child']);

    expect(result, 'to satisfy', {
      ts: 123,
      verbose: true,
    });
  });

  it('throws when sync parse() has async global transform in nested command', () => {
    const cli = bargs('test-cli')
      .globals(
        map(opt.options({ verbose: opt.boolean() }), async ({ values }) => {
          await Promise.resolve();
          return { positionals: [] as const, values };
        }),
      )
      .command('parent', (parent) =>
        parent.command('child', opt.options({}), () => {}),
      );

    expect(
      () => cli.parse(['parent', 'child']),
      'to throw',
      /Async.*global transform.*Use parseAsync/,
    );
  });
});

describe('defaultCommand edge cases', () => {
  it('defaultCommand with Command object', async () => {
    let executed = false;

    const cmd = handle(opt.options({ flag: opt.boolean() }), () => {
      executed = true;
    });

    const cli = bargs('test-cli').defaultCommand(cmd);

    await cli.parseAsync(['--flag']);

    expect(executed, 'to be', true);
  });

  it('defaultCommand with Parser and handler', async () => {
    let result: unknown;

    const cli = bargs('test-cli').defaultCommand(
      opt.options({ name: opt.string({ default: 'world' }) }),
      ({ values }) => {
        result = values;
      },
    );

    await cli.parseAsync(['--name', 'Alice']);

    expect(result, 'to satisfy', { name: 'Alice' });
  });
});

describe('command transforms', () => {
  it('applies both global and command transforms', async () => {
    let result: unknown;

    const cli = bargs('test-cli')
      .globals(
        map(opt.options({ x: opt.number({ default: 1 }) }), ({ values }) => ({
          positionals: [] as const,
          values: { ...values, globalTransformed: true },
        })),
      )
      .command(
        'run',
        map(opt.options({ y: opt.number({ default: 2 }) }), ({ values }) => ({
          positionals: [] as const,
          values: { ...values, commandTransformed: true },
        })),
        ({ values }) => {
          result = values;
        },
      );

    await cli.parseAsync(['run', '--x', '10', '--y', '20']);

    expect(result, 'to satisfy', {
      commandTransformed: true,
      globalTransformed: true,
      x: 10,
      y: 20,
    });
  });

  it('applies async command transform', async () => {
    let result: unknown;

    const cli = bargs('test-cli').command(
      'run',
      map(
        opt.options({ delay: opt.number({ default: 1 }) }),
        async ({ values }) => {
          await new Promise((resolve) => setTimeout(resolve, values.delay));
          return {
            positionals: [] as const,
            values: { ...values, asyncDone: true },
          };
        },
      ),
      ({ values }) => {
        result = values;
      },
    );

    await cli.parseAsync(['run', '--delay', '1']);

    expect(result, 'to satisfy', {
      asyncDone: true,
      delay: 1,
    });
  });

  it('throws on sync parse() with async command transform', () => {
    const cli = bargs('test-cli').command(
      'run',
      map(opt.options({}), async (r) => {
        await Promise.resolve();
        return r;
      }),
      () => {},
    );

    expect(
      () => cli.parse(['run']),
      'to throw',
      /Async.*command transform.*Use parseAsync/,
    );
  });
});
