import { expect } from 'bupkis';
import { describe, it } from 'node:test';
import { z } from 'zod';

import { parseCommands } from '../src/parser.js';

describe('parseCommands', () => {
  it('should parse a command with its options', async () => {
    let handlerCalled = false;
    let receivedArgs: unknown;

    await parseCommands({
      args: ['add', '--force'],
      commands: {
        add: {
          description: 'Add files',
          handler: async (args) => {
            handlerCalled = true;
            receivedArgs = args;
          },
          options: z.object({
            force: z.boolean().default(false),
          }),
        },
      },
      name: 'mycli',
      options: z.object({
        verbose: z.boolean().default(false),
      }),
    });

    expect(handlerCalled, 'to be true');
    expect(receivedArgs, 'to satisfy', {
      values: { force: true, verbose: false },
    });
  });

  it('should merge global and command options', async () => {
    let receivedArgs: unknown;

    await parseCommands({
      aliases: { verbose: ['v'] },
      args: ['add', '-v', '--force'],
      commands: {
        add: {
          description: 'Add files',
          handler: async (args) => {
            receivedArgs = args;
          },
          options: z.object({
            force: z.boolean().default(false),
          }),
        },
      },
      name: 'mycli',
      options: z.object({
        verbose: z.boolean().default(false),
      }),
    });

    expect(receivedArgs, 'to satisfy', {
      values: { force: true, verbose: true },
    });
  });

  it('should run defaultHandler when no command given (string)', async () => {
    let addCalled = false;

    await parseCommands({
      args: [],
      commands: {
        add: {
          description: 'Add files',
          handler: async () => {
            addCalled = true;
          },
        },
      },
      defaultHandler: 'add',
      name: 'mycli',
      options: z.object({}),
    });

    expect(addCalled, 'to be true');
  });

  it('should run defaultHandler when no command given (function)', async () => {
    let defaultCalled = false;

    await parseCommands({
      args: [],
      commands: {
        add: {
          description: 'Add files',
          handler: async () => {},
        },
      },
      defaultHandler: async () => {
        defaultCalled = true;
      },
      name: 'mycli',
      options: z.object({}),
    });

    expect(defaultCalled, 'to be true');
  });

  it('should parse command positionals', async () => {
    let receivedArgs: unknown;

    await parseCommands({
      args: ['add', 'file1.txt', 'file2.txt'],
      commands: {
        add: {
          description: 'Add files',
          handler: async (args) => {
            receivedArgs = args;
          },
          positionals: z.string().array(),
        },
      },
      name: 'mycli',
      options: z.object({}),
    });

    expect(receivedArgs, 'to satisfy', {
      command: 'add',
      positionals: ['file1.txt', 'file2.txt'],
      values: {},
    });
  });
});
