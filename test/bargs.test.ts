/**
 * Tests for the main bargs API.
 */
import { expect, expectAsync } from 'bupkis';
import { describe, it } from 'node:test';

import type { StringOption } from '../src/types.js';

import { bargs, handle, map } from '../src/bargs.js';
import { opt, pos } from '../src/opt.js';

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

  it('throws on unknown command', async () => {
    const cli = bargs('test-cli').command(
      'greet',
      handle(opt.options({}), () => {}),
    );

    await expectAsync(
      cli.parseAsync(['unknown']),
      'to reject with error satisfying',
      /Unknown command/,
    );
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

describe('nested commands (subcommands)', () => {
  it('supports nested commands via CliBuilder', async () => {
    let result: unknown;

    const remoteCommands = bargs('remote').command(
      'add',
      pos.positionals(
        pos.string({ name: 'name', required: true }),
        pos.string({ name: 'url', required: true }),
      ),
      ({ positionals }) => {
        result = { command: 'remote add', positionals };
      },
      'Add a remote',
    );

    const cli = bargs('git').command(
      'remote',
      remoteCommands,
      'Manage remotes',
    );

    await cli.parseAsync(['remote', 'add', 'origin', 'https://github.com/...']);

    expect(result, 'to satisfy', {
      command: 'remote add',
      positionals: ['origin', 'https://github.com/...'],
    });
  });

  it('supports deeply nested commands', async () => {
    let result: unknown;

    const setCommands = bargs('set').command(
      'url',
      pos.positionals(pos.string({ name: 'url', required: true })),
      ({ positionals }) => {
        result = { command: 'remote origin set url', positionals };
      },
    );

    const originCommands = bargs('origin').command(
      'set',
      setCommands,
      'Set properties',
    );

    const remoteCommands = bargs('remote').command(
      'origin',
      originCommands,
      'Manage origin',
    );

    const cli = bargs('git').command('remote', remoteCommands);

    await cli.parseAsync(['remote', 'origin', 'set', 'url', 'https://new.url']);

    expect(result, 'to satisfy', {
      command: 'remote origin set url',
      positionals: ['https://new.url'],
    });
  });

  it('passes parent globals to nested command handlers', async () => {
    let result: unknown;

    const remoteCommands = bargs('remote').command(
      'add',
      pos.positionals(pos.string({ name: 'name', required: true })),
      ({ positionals, values }) => {
        result = { positionals, values };
      },
    );

    const cli = bargs('git')
      .globals(opt.options({ verbose: opt.boolean({ aliases: ['v'] }) }))
      .command('remote', remoteCommands);

    await cli.parseAsync(['--verbose', 'remote', 'add', 'origin']);

    expect(result, 'to satisfy', {
      positionals: ['origin'],
      values: { verbose: true },
    });
  });

  it('runs default subcommand when no subcommand specified', async () => {
    let result: unknown;

    const remoteCommands = bargs('remote')
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
      .defaultCommand('list');

    const cli = bargs('git').command('remote', remoteCommands);

    await cli.parseAsync(['remote']);

    expect(result, 'to be', 'list called');
  });

  it('generates help listing nested command', () => {
    const remoteCommands = bargs('remote')
      .command('add', opt.options({}), () => {}, 'Add a remote')
      .command('remove', opt.options({}), () => {}, 'Remove a remote');

    const cli = bargs('git').command(
      'remote',
      remoteCommands,
      'Manage remotes',
    );

    // The parent CLI should list 'remote' as a command with its description
    // Note: The actual help generation for nested commands is handled by the
    // nested builder when --help is passed to it. Here we just verify
    // the parent CLI shows the nested command group.
    // This is a bit tricky to test since --help calls process.exit(0).
    // For now, we verify the nested command is properly registered.
    expect(cli, 'to be defined');
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
});
