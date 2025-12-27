import { expect } from 'bupkis';
import { describe, it, mock } from 'node:test';
import { z } from 'zod';

import { bargs } from '../src/index.js';

describe('bargs', () => {
  it('should parse simple CLI and return BargsResult', async () => {
    const result = await bargs({
      args: ['--verbose'],
      name: 'mycli',
      options: z.object({
        verbose: z.boolean().default(false),
      }),
    });
    expect(result, 'to satisfy', {
      command: undefined,
      positionals: [],
      values: { verbose: true },
    });
  });

  it('should run handler and still return result', async () => {
    let called = false;
    const result = await bargs({
      args: ['--verbose'],
      handler: async ({ values }) => {
        called = true;
        expect(values.verbose, 'to be true');
      },
      name: 'mycli',
      options: z.object({
        verbose: z.boolean().default(false),
      }),
    });
    expect(called, 'to be true');
    // Now always returns result, even with handler
    expect(result.values, 'to satisfy', { verbose: true });
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
        args: ['--help'],
        description: 'A test CLI',
        name: 'mycli',
        options: z.object({
          verbose: z.boolean().default(false),
        }),
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
        args: ['--version'],
        name: 'mycli',
        options: z.object({}),
        version: '1.2.3',
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
      args: ['test'],
      commands: {
        test: {
          description: 'Test command',
          handler: async () => {
            called = true;
          },
        },
      },
      name: 'mycli',
      options: z.object({}),
    });
    expect(called, 'to be true');
  });
});
