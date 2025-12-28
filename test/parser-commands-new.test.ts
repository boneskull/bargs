// test/parser-commands-new.test.ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { opt } from '../src/opt.js';
import { parseCommands } from '../src/parser-new.js';

describe('parseCommands', () => {
  it('parses a command with options', async () => {
    const result = await parseCommands({
      name: 'test-cli',
      options: {
        verbose: opt.boolean({ default: false }),
      },
      commands: {
        greet: opt.command({
          description: 'Greet someone',
          options: {
            name: opt.string({ default: 'world' }),
          },
          handler: () => {},
        }),
      },
      args: ['greet', '--name', 'Alice', '--verbose'],
    });

    assert.equal(result.command, 'greet');
    assert.deepEqual(result.values, { verbose: true, name: 'Alice' });
  });

  it('parses command positionals', async () => {
    const result = await parseCommands({
      name: 'test-cli',
      commands: {
        echo: opt.command({
          description: 'Echo text',
          positionals: [opt.stringPos({ required: true })],
          handler: () => {},
        }),
      },
      args: ['echo', 'hello'],
    });

    assert.equal(result.command, 'echo');
    assert.deepEqual(result.positionals, ['hello']);
  });

  it('calls command handler', async () => {
    let handlerCalled = false;

    await parseCommands({
      name: 'test-cli',
      commands: {
        run: opt.command({
          description: 'Run something',
          handler: () => {
            handlerCalled = true;
          },
        }),
      },
      args: ['run'],
    });

    assert.equal(handlerCalled, true);
  });

  it('uses defaultHandler when no command given', async () => {
    let defaultCalled = false;

    await parseCommands({
      name: 'test-cli',
      commands: {
        run: opt.command({
          description: 'Run something',
          handler: () => {},
        }),
      },
      defaultHandler: () => {
        defaultCalled = true;
      },
      args: [],
    });

    assert.equal(defaultCalled, true);
  });

  it('throws on unknown command', async () => {
    await assert.rejects(
      parseCommands({
        name: 'test-cli',
        commands: {
          run: opt.command({
            description: 'Run something',
            handler: () => {},
          }),
        },
        args: ['unknown'],
      }),
      /Unknown command: unknown/,
    );
  });

  it('merges global and command options', async () => {
    const result = await parseCommands({
      name: 'test-cli',
      options: {
        verbose: opt.boolean({ default: false }),
        debug: opt.boolean({ default: false }),
      },
      commands: {
        test: opt.command({
          description: 'Run tests',
          options: {
            filter: opt.string(),
          },
          handler: () => {},
        }),
      },
      args: ['test', '--verbose', '--filter', 'foo'],
    });

    assert.equal(result.command, 'test');
    assert.equal(result.values.verbose, true);
    assert.equal(result.values.debug, false);
    assert.equal(result.values.filter, 'foo');
  });

  it('uses named default command when no command given', async () => {
    let runCalled = false;

    await parseCommands({
      name: 'test-cli',
      commands: {
        run: opt.command({
          description: 'Run something',
          handler: () => {
            runCalled = true;
          },
        }),
        build: opt.command({
          description: 'Build something',
          handler: () => {},
        }),
      },
      defaultHandler: 'run',
      args: [],
    });

    assert.equal(runCalled, true);
  });
});
