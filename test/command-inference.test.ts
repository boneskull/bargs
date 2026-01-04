import { expect } from 'bupkis';
/**
 * Tests for command handler type inference. These tests verify that inline
 * command handlers get properly typed.
 */
import { describe, it } from 'node:test';

import { bargs, bargsAsync } from '../src/index.js';

describe('command handler type inference', () => {
  it('infers handler values type for inline commands', () => {
    let capturedValues: unknown;

    bargs({
      args: ['cmd', '--local', 'value'],
      commands: {
        cmd: {
          description: 'test command',
          handler: ({ values }) => {
            capturedValues = values;
            type IsAny<T> = 0 extends 1 & T ? true : false;
            type AssertFalse<_T extends false> = true;

            // Compile-time guard: inline commands should not leak `any` into handler types.
            const _globalIsNotAny: AssertFalse<IsAny<typeof values.global>> =
              true;
            const _localIsNotAny: AssertFalse<IsAny<typeof values.local>> =
              true;

            const g = values.global;
            const l = values.local;
            expect(typeof g, 'to equal', 'string');
            expect(typeof l, 'to equal', 'string');
          },
          options: bargs.options({
            local: bargs.string({ default: 'l' }),
          }),
        },
      },
      name: 'test',
      options: {
        global: bargs.string({ default: 'g' }),
      },
    });

    expect(capturedValues, 'to satisfy', {
      global: 'g',
      local: 'value',
    });
  });

  it('infers handler positionals type for inline commands', async () => {
    let capturedPositionals: unknown;

    await bargsAsync({
      args: ['cmd', 'arg1', 'arg2'],
      commands: {
        cmd: {
          description: 'test command',
          handler: ({ positionals }) => {
            capturedPositionals = positionals;
            const [first, second] = positionals;
            expect(typeof first, 'to equal', 'string');
            expect(
              second === undefined || typeof second === 'string',
              'to be true',
            );
          },
          positionals: bargs.positionals(
            bargs.stringPos({ required: true }),
            bargs.stringPos(),
          ),
        },
      },
      name: 'test',
    });

    expect(capturedPositionals, 'to satisfy', ['arg1', 'arg2']);
  });

  it('infers global options type with bargs.command<TGlobalOptions>()', () => {
    const globalOptions = {
      config: bargs.string({ default: 'default.json' }),
      verbose: bargs.boolean({ default: false }),
    } as const;

    const myCommand = bargs.command<typeof globalOptions>()({
      description: 'test command with global options',
      handler: ({ positionals, values }) => {
        const v: boolean = values.verbose;
        const c: string = values.config;
        const l: string = values.local;
        const [file] = positionals;
        const f: string = file;

        expect(typeof v, 'to equal', 'boolean');
        expect(typeof c, 'to equal', 'string');
        expect(typeof l, 'to equal', 'string');
        expect(typeof f, 'to equal', 'string');
      },
      options: {
        local: bargs.string({ default: 'local-value' }),
      },
      positionals: [bargs.stringPos({ name: 'file', required: true })],
    });

    bargs({
      args: ['cmd', 'myfile.txt'],
      commands: { cmd: myCommand },
      name: 'test',
      options: globalOptions,
    });
  });
});
