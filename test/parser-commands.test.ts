// test/parser-commands.test.ts
import { expect, expectAsync } from 'bupkis';
import { describe, it } from 'node:test';

import { opt } from '../src/opt.js';
import { parseCommandsAsync as parseCommands } from '../src/parser.js';

describe('parseCommands', () => {
  it('parses a command with options', async () => {
    const result = await parseCommands({
      args: ['greet', '--name', 'Alice', '--verbose'],
      commands: {
        greet: opt.command({
          description: 'Greet someone',
          handler: () => {},
          options: {
            name: opt.string({ default: 'world' }),
          },
        }),
      },
      name: 'test-cli',
      options: {
        verbose: opt.boolean({ default: false }),
      },
    });

    expect(result.command, 'to be', 'greet');
    expect(result.values, 'to deeply equal', { name: 'Alice', verbose: true });
  });

  it('parses command positionals', async () => {
    const result = await parseCommands({
      args: ['echo', 'hello'],
      commands: {
        echo: opt.command({
          description: 'Echo text',
          handler: () => {},
          positionals: [opt.stringPos({ required: true })],
        }),
      },
      name: 'test-cli',
    });

    expect(result.command, 'to be', 'echo');
    expect(result.positionals, 'to deeply equal', ['hello']);
  });

  it('calls command handler', async () => {
    let handlerCalled = false;

    await parseCommands({
      args: ['run'],
      commands: {
        run: opt.command({
          description: 'Run something',
          handler: () => {
            handlerCalled = true;
          },
        }),
      },
      name: 'test-cli',
    });

    expect(handlerCalled, 'to be', true);
  });

  it('uses defaultHandler when no command given', async () => {
    let defaultCalled = false;

    await parseCommands({
      args: [],
      commands: {
        run: opt.command({
          description: 'Run something',
          handler: () => {},
        }),
      },
      defaultHandler: () => {
        defaultCalled = true;
      },
      name: 'test-cli',
    });

    expect(defaultCalled, 'to be', true);
  });

  it('throws on unknown command', async () => {
    await expectAsync(
      parseCommands({
        args: ['unknown'],
        commands: {
          run: opt.command({
            description: 'Run something',
            handler: () => {},
          }),
        },
        name: 'test-cli',
      }),
      'to reject with error satisfying',
      /Unknown command: unknown/,
    );
  });

  it('merges global and command options', async () => {
    const result = await parseCommands({
      args: ['test', '--verbose', '--filter', 'foo'],
      commands: {
        test: opt.command({
          description: 'Run tests',
          handler: () => {},
          options: {
            filter: opt.string(),
          },
        }),
      },
      name: 'test-cli',
      options: {
        debug: opt.boolean({ default: false }),
        verbose: opt.boolean({ default: false }),
      },
    });

    expect(result.command, 'to be', 'test');
    expect(result.values.verbose, 'to be', true);
    expect(result.values.debug, 'to be', false);
    // Command-specific options are merged at runtime but not in the return type
    expect((result.values as Record<string, unknown>).filter, 'to be', 'foo');
  });

  it('uses named default command when no command given', async () => {
    let runCalled = false;

    await parseCommands({
      args: [],
      commands: {
        build: opt.command({
          description: 'Build something',
          handler: () => {},
        }),
        run: opt.command({
          description: 'Run something',
          handler: () => {
            runCalled = true;
          },
        }),
      },
      defaultHandler: 'run',
      name: 'test-cli',
    });

    expect(runCalled, 'to be', true);
  });
});
