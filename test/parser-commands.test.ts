import { describe, it } from 'node:test';
import { expect } from 'bupkis';
import { z } from 'zod';
import { parseCommands } from '../src/parser.js';

describe('parseCommands', () => {
  it('should parse a command with its options', async () => {
    let handlerCalled = false;
    let receivedArgs: unknown;

    await parseCommands({
      name: 'mycli',
      globalOptions: z.object({
        verbose: z.boolean().default(false),
      }),
      commands: {
        add: {
          description: 'Add files',
          options: z.object({
            force: z.boolean().default(false),
          }),
          handler: async (args) => {
            handlerCalled = true;
            receivedArgs = args;
          },
        },
      },
      args: ['add', '--force'],
    });

    expect(handlerCalled, 'to be true');
    expect(receivedArgs, 'to satisfy', { force: true, verbose: false });
  });

  it('should merge global and command options', async () => {
    let receivedArgs: unknown;

    await parseCommands({
      name: 'mycli',
      globalOptions: z.object({
        verbose: z.boolean().default(false),
      }),
      globalAliases: { verbose: ['v'] },
      commands: {
        add: {
          description: 'Add files',
          options: z.object({
            force: z.boolean().default(false),
          }),
          handler: async (args) => {
            receivedArgs = args;
          },
        },
      },
      args: ['add', '-v', '--force'],
    });

    expect(receivedArgs, 'to satisfy', { verbose: true, force: true });
  });

  it('should run defaultHandler when no command given (string)', async () => {
    let addCalled = false;

    await parseCommands({
      name: 'mycli',
      globalOptions: z.object({}),
      commands: {
        add: {
          description: 'Add files',
          handler: async () => {
            addCalled = true;
          },
        },
      },
      defaultHandler: 'add',
      args: [],
    });

    expect(addCalled, 'to be true');
  });

  it('should run defaultHandler when no command given (function)', async () => {
    let defaultCalled = false;

    await parseCommands({
      name: 'mycli',
      globalOptions: z.object({}),
      commands: {
        add: {
          description: 'Add files',
          handler: async () => {},
        },
      },
      defaultHandler: async () => {
        defaultCalled = true;
      },
      args: [],
    });

    expect(defaultCalled, 'to be true');
  });

  it('should parse command positionals', async () => {
    let receivedArgs: unknown;

    await parseCommands({
      name: 'mycli',
      globalOptions: z.object({}),
      commands: {
        add: {
          description: 'Add files',
          positionals: z.string().array(),
          handler: async (args) => {
            receivedArgs = args;
          },
        },
      },
      args: ['add', 'file1.txt', 'file2.txt'],
    });

    expect(receivedArgs, 'to satisfy', { positionals: ['file1.txt', 'file2.txt'] });
  });
});
