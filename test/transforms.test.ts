/**
 * Runtime tests for transforms feature.
 *
 * Note: These tests use type assertions (as any) because the transforms type
 * inference requires complex generic constraints that are difficult to express
 * in test code. The runtime behavior is what we're testing here.
 */
/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return */
import { expect } from 'bupkis';
import { describe, it } from 'node:test';

import type { BargsConfig, BargsConfigWithCommands } from '../src/types.js';

import { bargs, bargsAsync } from '../src/bargs.js';
import { BargsError } from '../src/errors.js';
import { opt } from '../src/opt.js';

describe('transforms (sync)', () => {
  describe('values transforms', () => {
    it('transforms values before handler receives them', () => {
      let handlerResult: { values: { name: string; uppercased: string } };

      bargs({
        args: ['--name', 'alice'],
        handler: (result: any) => {
          handlerResult = result;
        },
        name: 'test-cli',
        options: {
          name: opt.string({ default: 'world' }),
        },
        transforms: {
          values: (v: { name: string }) => ({
            ...v,
            uppercased: v.name.toUpperCase(),
          }),
        },
      } as BargsConfig<any, any, any, any>);

      expect(handlerResult!.values, 'to deeply equal', {
        name: 'alice',
        uppercased: 'ALICE',
      });
    });

    it('returns transformed values from bargs()', () => {
      const result = bargs({
        args: ['--count', '5'],
        name: 'test-cli',
        options: {
          count: opt.number({ default: 0 }),
        },
        transforms: {
          values: (v: { count: number }) => ({
            ...v,
            doubled: v.count * 2,
          }),
        },
      } as BargsConfig<any, any, any, any>);

      expect(result.values, 'to deeply equal', {
        count: 5,
        doubled: 10,
      });
    });
  });

  describe('positionals transforms', () => {
    it('transforms positionals before handler receives them', () => {
      let handlerResult: { positionals: readonly [string, number] };

      bargs({
        args: ['hello', '42'],
        handler: (result: any) => {
          handlerResult = result;
        },
        name: 'test-cli',
        positionals: opt.positionals(
          opt.stringPos({ required: true }),
          opt.stringPos({ required: true }),
        ),
        transforms: {
          positionals: ([first, second]: readonly [string, string]) =>
            [first, parseInt(second, 10)] as const,
        },
      } as BargsConfig<any, any, any, any>);

      expect(handlerResult!.positionals, 'to deeply equal', ['hello', 42]);
    });

    it('returns transformed positionals from bargs()', () => {
      const result = bargs({
        args: ['file.txt'],
        name: 'test-cli',
        positionals: opt.positionals(opt.stringPos({ required: true })),
        transforms: {
          positionals: ([filename]: readonly [string]) =>
            [{ extension: filename.split('.').pop(), filename }] as const,
        },
      } as BargsConfig<any, any, any, any>);

      expect(result.positionals, 'to deeply equal', [
        { extension: 'txt', filename: 'file.txt' },
      ]);
    });
  });

  describe('combined transforms', () => {
    it('applies both values and positionals transforms', () => {
      const result = bargs({
        args: ['--verbose', 'input.txt'],
        name: 'test-cli',
        options: {
          verbose: opt.boolean({ default: false }),
        },
        positionals: opt.positionals(opt.stringPos({ required: true })),
        transforms: {
          positionals: ([filename]: readonly [string]) =>
            [filename.toUpperCase()] as const,
          values: (v: { verbose: boolean }) => ({ ...v, debug: v.verbose }),
        },
      } as BargsConfig<any, any, any, any>);

      expect(result.values, 'to deeply equal', {
        debug: true,
        verbose: true,
      });
      expect(result.positionals, 'to deeply equal', ['INPUT.TXT']);
    });
  });

  describe('sync transform error handling', () => {
    it('throws when sync bargs() receives async values transform', () => {
      expect(
        () =>
          bargs({
            args: [],
            name: 'test-cli',
            options: {
              name: opt.string({ default: 'world' }),
            },
            transforms: {
              values: async (v: any) => v,
            },
          } as BargsConfig<any, any, any, any>),
        'to throw a',
        BargsError,
        'satisfying',
        { message: /thenable/ },
      );
    });

    it('throws when sync bargs() receives async positionals transform', () => {
      expect(
        () =>
          bargs({
            args: ['file.txt'],
            name: 'test-cli',
            positionals: opt.positionals(opt.stringPos({ required: true })),
            transforms: {
              positionals: async (p: any) => p,
            },
          } as BargsConfig<any, any, any, any>),
        'to throw a',
        BargsError,
        'satisfying',
        { message: /thenable/ },
      );
    });
  });
});

describe('command transforms', () => {
  describe('command-level transforms', () => {
    it('applies command-level transforms', () => {
      let handlerResult: {
        command: string;
        values: { greeting: string; name: string };
      };

      bargs({
        args: ['greet', '--name', 'alice'],
        commands: {
          greet: opt.command({
            description: 'Greet someone',
            handler: (result: any) => {
              handlerResult = result;
            },
            options: {
              name: opt.string({ default: 'world' }),
            },
            transforms: {
              values: (v: { name: string }) => ({
                ...v,
                greeting: `Hello, ${v.name}!`,
              }),
            },
          }),
        },
        name: 'test-cli',
      } as BargsConfigWithCommands<any, any>);

      expect(handlerResult!.values, 'to deeply equal', {
        greeting: 'Hello, alice!',
        name: 'alice',
      });
    });

    it('applies command-level positionals transforms', () => {
      let handlerResult: {
        positionals: readonly [{ filename: string; upper: string }];
      };

      bargs({
        args: ['process', 'file.txt'],
        commands: {
          process: opt.command({
            description: 'Process a file',
            handler: (result: any) => {
              handlerResult = result;
            },
            positionals: opt.positionals(opt.stringPos({ required: true })),
            transforms: {
              positionals: ([filename]: readonly [string]) =>
                [{ filename, upper: filename.toUpperCase() }] as const,
            },
          }),
        },
        name: 'test-cli',
      } as BargsConfigWithCommands<any, any>);

      expect(handlerResult!.positionals, 'to deeply equal', [
        { filename: 'file.txt', upper: 'FILE.TXT' },
      ]);
    });
  });

  describe('top-level transforms with commands', () => {
    it('applies top-level transforms before command transforms', () => {
      let handlerResult: {
        values: { level: number; name: string; timestamp: number };
      };

      bargs({
        args: ['greet', '--name', 'bob', '--verbose'],
        commands: {
          greet: opt.command({
            description: 'Greet someone',
            handler: (result: any) => {
              handlerResult = result;
            },
            options: {
              name: opt.string({ default: 'world' }),
            },
            transforms: {
              // Command transform adds level based on timestamp from top-level
              values: (v: any) => ({
                ...v,
                level: v.timestamp > 0 ? 1 : 0,
              }),
            },
          }),
        },
        name: 'test-cli',
        options: {
          verbose: opt.boolean({ default: false }),
        },
        transforms: {
          // Top-level transform adds timestamp
          values: (v: any) => ({
            ...v,
            timestamp: 12345,
          }),
        },
      } as any);

      // Top-level transform runs first (adds timestamp)
      // Then command transform runs (sees timestamp, adds level)
      expect(handlerResult!.values, 'to satisfy', {
        level: 1,
        name: 'bob',
        timestamp: 12345,
      });
    });
  });

  describe('async command transforms', () => {
    it('awaits async command transforms', async () => {
      let handlerResult: {
        values: { name: string; validated: boolean };
      };

      await bargsAsync({
        args: ['greet', '--name', 'charlie'],
        commands: {
          greet: opt.command({
            description: 'Greet someone',
            handler: (result: any) => {
              handlerResult = result;
            },
            options: {
              name: opt.string({ default: 'world' }),
            },
            transforms: {
              values: async (v: { name: string }) => {
                await Promise.resolve(); // simulate async validation
                return { ...v, validated: true };
              },
            },
          }),
        },
        name: 'test-cli',
      } as BargsConfigWithCommands<any, any>);

      expect(handlerResult!.values, 'to deeply equal', {
        name: 'charlie',
        validated: true,
      });
    });
  });
});

describe('transforms (async)', () => {
  describe('async values transforms', () => {
    it('awaits async values transform', async () => {
      let handlerResult: { values: { fetched: string; name: string } };

      await bargsAsync({
        args: ['--name', 'alice'],
        handler: (result: any) => {
          handlerResult = result;
        },
        name: 'test-cli',
        options: {
          name: opt.string({ default: 'world' }),
        },
        transforms: {
          values: async (v: { name: string }) => {
            await Promise.resolve(); // simulate async work
            return {
              ...v,
              fetched: `fetched-${v.name}`,
            };
          },
        },
      } as BargsConfig<any, any, any, any>);

      expect(handlerResult!.values, 'to deeply equal', {
        fetched: 'fetched-alice',
        name: 'alice',
      });
    });

    it('returns transformed values from bargsAsync()', async () => {
      const result = await bargsAsync({
        args: ['--count', '3'],
        name: 'test-cli',
        options: {
          count: opt.number({ default: 0 }),
        },
        transforms: {
          values: async (v: { count: number }) => ({
            ...v,
            tripled: v.count * 3,
          }),
        },
      } as BargsConfig<any, any, any, any>);

      expect(result.values, 'to deeply equal', {
        count: 3,
        tripled: 9,
      });
    });
  });

  describe('async positionals transforms', () => {
    it('awaits async positionals transform', async () => {
      const result = await bargsAsync({
        args: ['file.txt'],
        name: 'test-cli',
        positionals: opt.positionals(opt.stringPos({ required: true })),
        transforms: {
          positionals: async ([filename]: readonly [string]) => {
            await Promise.resolve(); // simulate async work
            return [{ filename, loaded: true }] as const;
          },
        },
      } as BargsConfig<any, any, any, any>);

      expect(result.positionals, 'to deeply equal', [
        { filename: 'file.txt', loaded: true },
      ]);
    });
  });

  describe('sync transforms in async context', () => {
    it('sync transforms work in bargsAsync()', async () => {
      const result = await bargsAsync({
        args: ['--name', 'bob'],
        name: 'test-cli',
        options: {
          name: opt.string({ default: 'world' }),
        },
        transforms: {
          values: (v: { name: string }) => ({ ...v, sync: true }),
        },
      } as BargsConfig<any, any, any, any>);

      expect(result.values, 'to deeply equal', {
        name: 'bob',
        sync: true,
      });
    });
  });
});
