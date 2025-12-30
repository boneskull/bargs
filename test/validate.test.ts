// test/validate.test.ts
/* eslint-disable @typescript-eslint/no-unsafe-argument */
// ^ Intentional: tests must pass invalid types to test validation
import { expect } from 'bupkis';
import { describe, it } from 'node:test';

import { type ValidationError } from '../src/errors.js';
import { opt } from '../src/opt.js';
import { validateConfig } from '../src/validate.js';

describe('validateConfig', () => {
  describe('base config validation', () => {
    it('requires config to be an object', () => {
      expect(
        () => validateConfig(null as any),
        'to throw a',
        Error,
        'satisfying',
        {
          name: 'ValidationError',
          path: 'config',
          message: /must be an object/,
        },
      );

      expect(
        () => validateConfig('not-an-object' as any),
        'to throw error satisfying',
        { message: /must be an object/ },
      );
    });

    it('requires name to be a non-empty string', () => {
      expect(
        () => validateConfig({ name: 123 } as any),
        'to throw a',
        Error,
        'satisfying',
        {
          path: 'config.name',
          message: /must be a string/,
        },
      );

      expect(
        () => validateConfig({ name: '' }),
        'to throw a',
        Error,
        'satisfying',
        {
          path: 'config.name',
          message: /must not be empty/,
        },
      );
    });

    it('accepts valid name', () => {
      expect(() => validateConfig({ name: 'my-cli' }), 'not to throw');
    });

    it('validates optional description', () => {
      expect(
        () => validateConfig({ description: 'A CLI tool', name: 'my-cli' }),
        'not to throw',
      );

      expect(
        () => validateConfig({ description: 123, name: 'my-cli' } as any),
        'to throw a',
        Error,
        'satisfying',
        {
          path: 'config.description',
          message: /must be a string/,
        },
      );
    });

    it('validates optional version', () => {
      expect(
        () => validateConfig({ name: 'my-cli', version: '1.0.0' }),
        'not to throw',
      );

      expect(
        () => validateConfig({ name: 'my-cli', version: 1 } as any),
        'to throw a',
        Error,
        'satisfying',
        {
          path: 'config.version',
          message: /must be a string/,
        },
      );
    });

    it('validates optional args', () => {
      expect(
        () => validateConfig({ args: ['--flag'], name: 'my-cli' }),
        'not to throw',
      );

      expect(
        () => validateConfig({ args: 'not-an-array', name: 'my-cli' } as any),
        'to throw a',
        Error,
        'satisfying',
        {
          path: 'config.args',
          message: /must be an array of strings/,
        },
      );

      expect(
        () => validateConfig({ args: [1, 2, 3], name: 'my-cli' } as any),
        'to throw a',
        Error,
        'satisfying',
        {
          path: 'config.args',
          message: /must be an array of strings/,
        },
      );
    });
  });

  describe('options schema validation', () => {
    it('validates option type discriminator', () => {
      expect(
        () =>
          validateConfig({
            name: 'my-cli',
            options: {
              flag: { type: 'invalid' } as any,
            },
          }),
        'to throw a',
        Error,
        'satisfying',
        {
          path: 'config.options.flag.type',
          message: /must be one of/,
        },
      );

      expect(
        () =>
          validateConfig({
            name: 'my-cli',
            options: {
              flag: {} as any,
            },
          }),
        'to throw a',
        Error,
        'satisfying',
        {
          path: 'config.options.flag.type',
          message: /must be a string/,
        },
      );
    });

    it('validates string option', () => {
      expect(
        () =>
          validateConfig({
            name: 'my-cli',
            options: {
              name: opt.string({ default: 'world' }),
            },
          }),
        'not to throw',
      );

      expect(
        () =>
          validateConfig({
            name: 'my-cli',
            options: {
              name: { default: 123, type: 'string' } as any,
            },
          }),
        'to throw a',
        Error,
        'satisfying',
        {
          path: 'config.options.name.default',
          message: /must be a string/,
        },
      );
    });

    it('validates boolean option', () => {
      expect(
        () =>
          validateConfig({
            name: 'my-cli',
            options: {
              verbose: opt.boolean({ default: false }),
            },
          }),
        'not to throw',
      );

      expect(
        () =>
          validateConfig({
            name: 'my-cli',
            options: {
              verbose: { default: 'yes', type: 'boolean' } as any,
            },
          }),
        'to throw a',
        Error,
        'satisfying',
        {
          path: 'config.options.verbose.default',
          message: /must be a boolean/,
        },
      );
    });

    it('validates number option', () => {
      expect(
        () =>
          validateConfig({
            name: 'my-cli',
            options: {
              count: opt.number({ default: 42 }),
            },
          }),
        'not to throw',
      );

      expect(
        () =>
          validateConfig({
            name: 'my-cli',
            options: {
              count: { default: '42', type: 'number' } as any,
            },
          }),
        'to throw a',
        Error,
        'satisfying',
        {
          path: 'config.options.count.default',
          message: /must be a number/,
        },
      );
    });

    it('validates count option', () => {
      expect(
        () =>
          validateConfig({
            name: 'my-cli',
            options: {
              verbose: opt.count({ default: 0 }),
            },
          }),
        'not to throw',
      );

      expect(
        () =>
          validateConfig({
            name: 'my-cli',
            options: {
              verbose: { default: 'many', type: 'count' } as any,
            },
          }),
        'to throw a',
        Error,
        'satisfying',
        {
          path: 'config.options.verbose.default',
          message: /must be a number/,
        },
      );
    });

    it('validates enum option choices', () => {
      expect(
        () =>
          validateConfig({
            name: 'my-cli',
            options: {
              level: opt.enum(['low', 'medium', 'high'] as const),
            },
          }),
        'not to throw',
      );

      expect(
        () =>
          validateConfig({
            name: 'my-cli',
            options: {
              level: { type: 'enum' } as any,
            },
          }),
        'to throw a',
        Error,
        'satisfying',
        {
          path: 'config.options.level.choices',
          message: /must be a non-empty array/,
        },
      );

      expect(
        () =>
          validateConfig({
            name: 'my-cli',
            options: {
              level: { choices: [], type: 'enum' } as any,
            },
          }),
        'to throw a',
        Error,
        'satisfying',
        {
          path: 'config.options.level.choices',
          message: /must not be empty/,
        },
      );
    });

    it('validates enum option default is in choices', () => {
      expect(
        () =>
          validateConfig({
            name: 'my-cli',
            options: {
              level: opt.enum(['low', 'medium', 'high'] as const, {
                default: 'medium',
              }),
            },
          }),
        'not to throw',
      );

      expect(
        () =>
          validateConfig({
            name: 'my-cli',
            options: {
              level: {
                choices: ['low', 'medium', 'high'],
                default: 'invalid',
                type: 'enum',
              },
            },
          }),
        'to throw a',
        Error,
        'satisfying',
        {
          path: 'config.options.level.default',
          message: /must be one of the choices/,
        },
      );
    });

    it('validates array option items', () => {
      expect(
        () =>
          validateConfig({
            name: 'my-cli',
            options: {
              files: opt.array('string'),
              ports: opt.array('number'),
            },
          }),
        'not to throw',
      );

      expect(
        () =>
          validateConfig({
            name: 'my-cli',
            options: {
              files: { items: 'boolean', type: 'array' } as any,
            },
          }),
        'to throw a',
        Error,
        'satisfying',
        {
          path: 'config.options.files.items',
          message: /"string" or "number"/,
        },
      );
    });

    it('validates array option default matches items type', () => {
      expect(
        () =>
          validateConfig({
            name: 'my-cli',
            options: {
              files: opt.array('string', { default: ['a.txt', 'b.txt'] }),
              ports: opt.array('number', { default: [80, 443] }),
            },
          }),
        'not to throw',
      );

      expect(
        () =>
          validateConfig({
            name: 'my-cli',
            options: {
              files: { default: [1, 2, 3], items: 'string', type: 'array' },
            },
          }),
        'to throw a',
        Error,
        'satisfying',
        {
          path: 'config.options.files.default',
          message: /must be an array of strings/,
        },
      );

      expect(
        () =>
          validateConfig({
            name: 'my-cli',
            options: {
              ports: { default: ['80', '443'], items: 'number', type: 'array' },
            },
          }),
        'to throw a',
        Error,
        'satisfying',
        {
          path: 'config.options.ports.default',
          message: /must be an array of numbers/,
        },
      );
    });

    it('validates aliases are single characters', () => {
      expect(
        () =>
          validateConfig({
            name: 'my-cli',
            options: {
              verbose: opt.boolean({ aliases: ['v'] }),
            },
          }),
        'not to throw',
      );

      expect(
        () =>
          validateConfig({
            name: 'my-cli',
            options: {
              verbose: { aliases: ['verbose'], type: 'boolean' },
            },
          }),
        'to throw a',
        Error,
        'satisfying',
        {
          path: 'config.options.verbose.aliases[0]',
          message: /must be a single character/,
        },
      );
    });

    it('detects duplicate aliases across options', () => {
      expect(
        () =>
          validateConfig({
            name: 'my-cli',
            options: {
              debug: { aliases: ['v'], type: 'boolean' },
              verbose: { aliases: ['v'], type: 'boolean' },
            },
          }),
        'to throw error satisfying',
        // Second option to be validated will fail
        { message: /alias "v" is already used/ },
      );
    });

    it('validates option description is a string', () => {
      expect(
        () =>
          validateConfig({
            name: 'my-cli',
            options: {
              verbose: { description: 123, type: 'boolean' } as any,
            },
          }),
        'to throw a',
        Error,
        'satisfying',
        {
          path: 'config.options.verbose.description',
          message: /must be a string/,
        },
      );
    });

    it('validates option group is a string', () => {
      expect(
        () =>
          validateConfig({
            name: 'my-cli',
            options: {
              verbose: { group: true, type: 'boolean' } as any,
            },
          }),
        'to throw a',
        Error,
        'satisfying',
        {
          path: 'config.options.verbose.group',
          message: /must be a string/,
        },
      );
    });

    it('validates option hidden is a boolean', () => {
      expect(
        () =>
          validateConfig({
            name: 'my-cli',
            options: {
              verbose: { hidden: 'yes', type: 'boolean' } as any,
            },
          }),
        'to throw a',
        Error,
        'satisfying',
        {
          path: 'config.options.verbose.hidden',
          message: /must be a boolean/,
        },
      );
    });

    it('validates option required is a boolean', () => {
      expect(
        () =>
          validateConfig({
            name: 'my-cli',
            options: {
              name: { required: 'yes', type: 'string' } as any,
            },
          }),
        'to throw a',
        Error,
        'satisfying',
        {
          path: 'config.options.name.required',
          message: /must be a boolean/,
        },
      );
    });
  });

  describe('positionals schema validation', () => {
    it('validates positionals is an array', () => {
      expect(
        () =>
          validateConfig({
            name: 'my-cli',
            positionals: 'not-an-array' as any,
          }),
        'to throw a',
        Error,
        'satisfying',
        {
          path: 'config.positionals',
          message: /must be an array/,
        },
      );
    });

    it('validates positional type discriminator', () => {
      expect(
        () =>
          validateConfig({
            name: 'my-cli',
            positionals: [{ type: 'invalid' }] as any,
          }),
        'to throw a',
        Error,
        'satisfying',
        {
          path: 'config.positionals[0].type',
          message: /must be one of/,
        },
      );
    });

    it('validates string positional', () => {
      expect(
        () =>
          validateConfig({
            name: 'my-cli',
            positionals: [opt.stringPos({ default: 'value' })],
          }),
        'not to throw',
      );

      expect(
        () =>
          validateConfig({
            name: 'my-cli',
            positionals: [{ default: 123, type: 'string' }] as any,
          }),
        'to throw a',
        Error,
        'satisfying',
        {
          path: 'config.positionals[0].default',
          message: /must be a string/,
        },
      );
    });

    it('validates number positional', () => {
      expect(
        () =>
          validateConfig({
            name: 'my-cli',
            positionals: [opt.numberPos({ default: 42 })],
          }),
        'not to throw',
      );

      expect(
        () =>
          validateConfig({
            name: 'my-cli',
            positionals: [{ default: '42', type: 'number' }] as any,
          }),
        'to throw a',
        Error,
        'satisfying',
        {
          path: 'config.positionals[0].default',
          message: /must be a number/,
        },
      );
    });

    it('validates enum positional choices', () => {
      expect(
        () =>
          validateConfig({
            name: 'my-cli',
            positionals: [opt.enumPos(['a', 'b', 'c'] as const)],
          }),
        'not to throw',
      );

      expect(
        () =>
          validateConfig({
            name: 'my-cli',
            positionals: [{ choices: [], type: 'enum' }] as any,
          }),
        'to throw a',
        Error,
        'satisfying',
        {
          path: 'config.positionals[0].choices',
          message: /must not be empty/,
        },
      );
    });

    it('validates enum positional default is in choices', () => {
      expect(
        () =>
          validateConfig({
            name: 'my-cli',
            positionals: [
              { choices: ['a', 'b', 'c'], default: 'd', type: 'enum' },
            ],
          }),
        'to throw a',
        Error,
        'satisfying',
        {
          path: 'config.positionals[0].default',
          message: /must be one of the choices/,
        },
      );
    });

    it('validates variadic positional items', () => {
      expect(
        () =>
          validateConfig({
            name: 'my-cli',
            positionals: [opt.variadic('string')],
          }),
        'not to throw',
      );

      expect(
        () =>
          validateConfig({
            name: 'my-cli',
            positionals: [{ items: 'boolean', type: 'variadic' }] as any,
          }),
        'to throw a',
        Error,
        'satisfying',
        {
          path: 'config.positionals[0].items',
          message: /"string" or "number"/,
        },
      );
    });

    it('validates variadic positional is last', () => {
      expect(
        () =>
          validateConfig({
            name: 'my-cli',
            positionals: [opt.variadic('string'), opt.stringPos()],
          }),
        'to throw a',
        Error,
        'satisfying',
        {
          path: 'config.positionals[0]',
          message: /variadic positional must be the last/,
        },
      );
    });

    it('validates required positionals do not follow optional', () => {
      expect(
        () =>
          validateConfig({
            name: 'my-cli',
            positionals: [
              opt.stringPos(), // optional
              opt.stringPos({ required: true }), // required - invalid!
            ],
          }),
        'to throw a',
        Error,
        'satisfying',
        {
          path: 'config.positionals[1]',
          message: /required positional cannot follow an optional/,
        },
      );
    });

    it('allows optional after required', () => {
      expect(
        () =>
          validateConfig({
            name: 'my-cli',
            positionals: [
              opt.stringPos({ required: true }),
              opt.stringPos(), // optional - valid
            ],
          }),
        'not to throw',
      );
    });

    it('validates positional description is a string', () => {
      expect(
        () =>
          validateConfig({
            name: 'my-cli',
            positionals: [{ description: 123, type: 'string' }] as any,
          }),
        'to throw a',
        Error,
        'satisfying',
        {
          path: 'config.positionals[0].description',
          message: /must be a string/,
        },
      );
    });

    it('validates positional name is a string', () => {
      expect(
        () =>
          validateConfig({
            name: 'my-cli',
            positionals: [{ name: 123, type: 'string' }] as any,
          }),
        'to throw a',
        Error,
        'satisfying',
        {
          path: 'config.positionals[0].name',
          message: /must be a string/,
        },
      );
    });

    it('validates positional required is a boolean', () => {
      expect(
        () =>
          validateConfig({
            name: 'my-cli',
            positionals: [{ required: 'yes', type: 'string' }] as any,
          }),
        'to throw a',
        Error,
        'satisfying',
        {
          path: 'config.positionals[0].required',
          message: /must be a boolean/,
        },
      );
    });
  });

  describe('simple CLI handler validation', () => {
    it('accepts function handler', () => {
      expect(
        () =>
          validateConfig({
            handler: () => {},
            name: 'my-cli',
          }),
        'not to throw',
      );
    });

    it('accepts array of function handlers', () => {
      expect(
        () =>
          validateConfig({
            handler: [() => {}, () => {}],
            name: 'my-cli',
          }),
        'not to throw',
      );
    });

    it('rejects non-function handler', () => {
      expect(
        () =>
          validateConfig({
            handler: 'not-a-function' as any,
            name: 'my-cli',
          }),
        'to throw a',
        Error,
        'satisfying',
        {
          path: 'config.handler',
          message: /must be a function/,
        },
      );
    });

    it('rejects empty handler array', () => {
      expect(
        () =>
          validateConfig({
            handler: [] as any,
            name: 'my-cli',
          }),
        'to throw a',
        Error,
        'satisfying',
        {
          path: 'config.handler',
          message: /must not be empty/,
        },
      );
    });

    it('rejects array with non-function element', () => {
      expect(
        () =>
          validateConfig({
            handler: [() => {}, 'not-a-function'] as any,
            name: 'my-cli',
          }),
        'to throw a',
        Error,
        'satisfying',
        {
          path: 'config.handler[1]',
          message: /must be a function/,
        },
      );
    });
  });

  describe('command-based CLI validation', () => {
    it('validates commands is required and non-empty', () => {
      expect(
        () =>
          validateConfig({
            commands: {},
            name: 'my-cli',
          } as any),
        'to throw a',
        Error,
        'satisfying',
        {
          path: 'config.commands',
          message: /must have at least one command/,
        },
      );
    });

    it('validates command description is required', () => {
      expect(
        () =>
          validateConfig({
            commands: {
              greet: { handler: () => {} } as any,
            },
            name: 'my-cli',
          }),
        'to throw a',
        Error,
        'satisfying',
        {
          path: 'config.commands.greet.description',
          message: /must be a string/,
        },
      );
    });

    it('validates command handler is required', () => {
      expect(
        () =>
          validateConfig({
            commands: {
              greet: { description: 'Say hi' } as any,
            },
            name: 'my-cli',
          }),
        'to throw a',
        Error,
        'satisfying',
        {
          path: 'config.commands.greet.handler',
          message: /is required/,
        },
      );
    });

    it('validates command options', () => {
      expect(
        () =>
          validateConfig({
            commands: {
              greet: {
                description: 'Say hi',
                handler: () => {},
                options: {
                  name: { type: 'invalid' } as any,
                },
              },
            },
            name: 'my-cli',
          }),
        'to throw a',
        Error,
        'satisfying',
        { path: 'config.commands.greet.options.name.type' },
      );
    });

    it('validates command positionals', () => {
      expect(
        () =>
          validateConfig({
            commands: {
              greet: {
                description: 'Say hi',
                handler: () => {},
                positionals: [{ type: 'invalid' }] as any,
              },
            },
            name: 'my-cli',
          }),
        'to throw a',
        Error,
        'satisfying',
        { path: 'config.commands.greet.positionals[0].type' },
      );
    });

    it('detects alias collision between global and command options', () => {
      expect(
        () =>
          validateConfig({
            commands: {
              greet: {
                description: 'Say hi',
                handler: () => {},
                options: {
                  name: { aliases: ['v'], type: 'string' },
                },
              },
            },
            name: 'my-cli',
            options: {
              verbose: { aliases: ['v'], type: 'boolean' },
            },
          }),
        'to throw error satisfying',
        { message: /alias "v" is already used/ },
      );
    });

    it('rejects top-level positionals in command-based CLI', () => {
      expect(
        () =>
          validateConfig({
            commands: {
              greet: {
                description: 'Say hi',
                handler: () => {},
              },
            },
            name: 'my-cli',
            positionals: [opt.stringPos()],
          } as any),
        'to throw a',
        Error,
        'satisfying',
        {
          path: 'config.positionals',
          message: /top-level positionals are not allowed in command-based CLIs/,
        },
      );
    });

    it('rejects top-level handler in command-based CLI', () => {
      expect(
        () =>
          validateConfig({
            commands: {
              greet: {
                description: 'Say hi',
                handler: () => {},
              },
            },
            handler: () => {},
            name: 'my-cli',
          } as any),
        'to throw a',
        Error,
        'satisfying',
        {
          path: 'config.handler',
          message: /use defaultHandler/,
        },
      );
    });

    it('validates defaultHandler as function', () => {
      expect(
        () =>
          validateConfig({
            commands: {
              greet: {
                description: 'Say hi',
                handler: () => {},
              },
            },
            defaultHandler: () => {},
            name: 'my-cli',
          }),
        'not to throw',
      );
    });

    it('validates defaultHandler as command name string', () => {
      expect(
        () =>
          validateConfig({
            commands: {
              greet: {
                description: 'Say hi',
                handler: () => {},
              },
            },
            defaultHandler: 'greet',
            name: 'my-cli',
          }),
        'not to throw',
      );
    });

    it('rejects defaultHandler referencing non-existent command', () => {
      expect(
        () =>
          validateConfig({
            commands: {
              greet: {
                description: 'Say hi',
                handler: () => {},
              },
            },
            defaultHandler: 'nonexistent',
            name: 'my-cli',
          }),
        'to throw a',
        Error,
        'satisfying',
        {
          path: 'config.defaultHandler',
          message: /must reference an existing command/,
        },
      );
    });

    it('rejects invalid defaultHandler type', () => {
      expect(
        () =>
          validateConfig({
            commands: {
              greet: {
                description: 'Say hi',
                handler: () => {},
              },
            },
            defaultHandler: 123 as any,
            name: 'my-cli',
          }),
        'to throw a',
        Error,
        'satisfying',
        {
          path: 'config.defaultHandler',
          message: /must be a function/,
        },
      );
    });
  });

  describe('valid complete configs', () => {
    it('accepts valid simple CLI config', () => {
      expect(
        () =>
          validateConfig({
            description: 'A simple CLI',
            handler: () => {},
            name: 'my-cli',
            options: {
              count: opt.number({ default: 1 }),
              debug: opt.boolean({ aliases: ['d'] }),
              level: opt.enum(['low', 'medium', 'high'] as const, {
                default: 'medium',
              }),
              name: opt.string({ required: true }),
              verbose: opt.count({ aliases: ['v'] }),
            },
            positionals: [
              opt.stringPos({ name: 'file', required: true }),
              opt.numberPos({ name: 'count' }),
            ],
            version: '1.0.0',
          }),
        'not to throw',
      );
    });

    it('accepts valid command-based CLI config', () => {
      expect(
        () =>
          validateConfig({
            commands: {
              add: {
                description: 'Add a task',
                handler: () => {},
                options: {
                  priority: opt.enum(['low', 'medium', 'high'] as const),
                },
                positionals: [opt.stringPos({ name: 'title', required: true })],
              },
              list: {
                description: 'List tasks',
                handler: () => {},
                options: {
                  all: opt.boolean(),
                },
              },
            },
            defaultHandler: 'list',
            description: 'Task manager',
            name: 'tasks',
            options: {
              verbose: opt.boolean({ aliases: ['v'] }),
            },
            version: '1.0.0',
          }),
        'not to throw',
      );
    });
  });
});
