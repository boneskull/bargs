// test/parser-commands.test.ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { opt } from '../src/opt.js';
import { parseCommands } from '../src/parser.js';

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

    assert.equal(result.command, 'greet');
    assert.deepEqual(result.values, { name: 'Alice', verbose: true });
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

    assert.equal(result.command, 'echo');
    assert.deepEqual(result.positionals, ['hello']);
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

    assert.equal(handlerCalled, true);
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

    assert.equal(defaultCalled, true);
  });

  it('uses array defaultHandler when no command given', async () => {
    const calls: number[] = [];

    await parseCommands({
      args: [],
      commands: {
        run: opt.command({
          description: 'Run something',
          handler: () => {},
        }),
      },
      defaultHandler: [
        () => {
          calls.push(1);
        },
        () => {
          calls.push(2);
        },
      ],
      name: 'test-cli',
    });

    assert.deepEqual(calls, [1, 2]);
  });

  it('throws on unknown command', async () => {
    await assert.rejects(
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

    assert.equal(result.command, 'test');
    assert.equal(result.values.verbose, true);
    assert.equal(result.values.debug, false);
    // Command-specific options are merged at runtime but not in the return type
    assert.equal((result.values as Record<string, unknown>).filter, 'foo');
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

    assert.equal(runCalled, true);
  });
});
