import { describe, it, mock } from 'node:test';
import { expect } from 'bupkis';
import { z } from 'zod';
import { bargs } from '../src/index.js';

describe('bargs', () => {
  it('should parse simple CLI and return args', async () => {
    const result = await bargs({
      name: 'mycli',
      options: z.object({
        verbose: z.boolean().default(false),
      }),
      args: ['--verbose'],
    });
    expect(result, 'to satisfy', { verbose: true });
  });

  it('should run handler and return void', async () => {
    let called = false;
    const result = await bargs({
      name: 'mycli',
      options: z.object({
        verbose: z.boolean().default(false),
      }),
      handler: async (args) => {
        called = true;
        expect(args.verbose, 'to be true');
      },
      args: ['--verbose'],
    });
    expect(called, 'to be true');
    expect(result, 'to be undefined');
  });

  it('should handle --help flag', async () => {
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => logs.push(args.join(' '));

    const exitMock = mock.fn(() => {
      throw new Error('EXIT');
    });
    const originalExit = process.exit;
    process.exit = exitMock as unknown as typeof process.exit;

    try {
      await bargs({
        name: 'mycli',
        description: 'A test CLI',
        options: z.object({
          verbose: z.boolean().default(false),
        }),
        args: ['--help'],
      });
    } catch (e) {
      expect((e as Error).message, 'to equal', 'EXIT');
    }

    console.log = originalLog;
    process.exit = originalExit;

    expect(logs.join('\n'), 'to contain', 'mycli');
    expect(logs.join('\n'), 'to contain', 'verbose');
  });

  it('should handle --version flag', async () => {
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => logs.push(args.join(' '));

    const exitMock = mock.fn(() => {
      throw new Error('EXIT');
    });
    const originalExit = process.exit;
    process.exit = exitMock as unknown as typeof process.exit;

    try {
      await bargs({
        name: 'mycli',
        version: '1.2.3',
        options: z.object({}),
        args: ['--version'],
      });
    } catch (e) {
      expect((e as Error).message, 'to equal', 'EXIT');
    }

    console.log = originalLog;
    process.exit = originalExit;

    expect(logs.join('\n'), 'to contain', '1.2.3');
  });

  it('should run command handler', async () => {
    let called = false;
    await bargs({
      name: 'mycli',
      globalOptions: z.object({}),
      commands: {
        test: {
          description: 'Test command',
          handler: async () => {
            called = true;
          },
        },
      },
      args: ['test'],
    });
    expect(called, 'to be true');
  });
});
