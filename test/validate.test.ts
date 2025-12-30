// test/validate.test.ts
/* eslint-disable @typescript-eslint/no-unsafe-argument */
// ^ Intentional: tests must pass invalid types to test validation
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { type ValidationError } from '../src/errors.js';
import { opt } from '../src/opt.js';
import { validateConfig } from '../src/validate.js';

describe('validateConfig', () => {
  describe('base config validation', () => {
    it('requires config to be an object', () => {
      assert.throws(
        () => validateConfig(null as any),
        (err: ValidationError) => {
          assert.equal(err.name, 'ValidationError');
          assert.equal(err.path, 'config');
          assert.match(err.message, /must be an object/);
          return true;
        },
      );

      assert.throws(
        () => validateConfig('not-an-object' as any),
        (err: ValidationError) => {
          assert.match(err.message, /must be an object/);
          return true;
        },
      );
    });

    it('requires name to be a non-empty string', () => {
      assert.throws(
        () => validateConfig({ name: 123 } as any),
        (err: ValidationError) => {
          assert.equal(err.path, 'config.name');
          assert.match(err.message, /must be a string/);
          return true;
        },
      );

      assert.throws(
        () => validateConfig({ name: '' }),
        (err: ValidationError) => {
          assert.equal(err.path, 'config.name');
          assert.match(err.message, /must not be empty/);
          return true;
        },
      );
    });

    it('accepts valid name', () => {
      assert.doesNotThrow(() => validateConfig({ name: 'my-cli' }));
    });

    it('validates optional description', () => {
      assert.doesNotThrow(() =>
        validateConfig({ description: 'A CLI tool', name: 'my-cli' }),
      );

      assert.throws(
        () => validateConfig({ description: 123, name: 'my-cli' } as any),
        (err: ValidationError) => {
          assert.equal(err.path, 'config.description');
          assert.match(err.message, /must be a string/);
          return true;
        },
      );
    });

    it('validates optional version', () => {
      assert.doesNotThrow(() =>
        validateConfig({ name: 'my-cli', version: '1.0.0' }),
      );

      assert.throws(
        () => validateConfig({ name: 'my-cli', version: 1 } as any),
        (err: ValidationError) => {
          assert.equal(err.path, 'config.version');
          assert.match(err.message, /must be a string/);
          return true;
        },
      );
    });

    it('validates optional args', () => {
      assert.doesNotThrow(() =>
        validateConfig({ args: ['--flag'], name: 'my-cli' }),
      );

      assert.throws(
        () => validateConfig({ args: 'not-an-array', name: 'my-cli' } as any),
        (err: ValidationError) => {
          assert.equal(err.path, 'config.args');
          assert.match(err.message, /must be an array of strings/);
          return true;
        },
      );

      assert.throws(
        () => validateConfig({ args: [1, 2, 3], name: 'my-cli' } as any),
        (err: ValidationError) => {
          assert.equal(err.path, 'config.args');
          assert.match(err.message, /must be an array of strings/);
          return true;
        },
      );
    });
  });

  describe('options schema validation', () => {
    it('validates option type discriminator', () => {
      assert.throws(
        () =>
          validateConfig({
            name: 'my-cli',
            options: {
              flag: { type: 'invalid' } as any,
            },
          }),
        (err: ValidationError) => {
          assert.equal(err.path, 'config.options.flag.type');
          assert.match(err.message, /must be one of/);
          return true;
        },
      );

      assert.throws(
        () =>
          validateConfig({
            name: 'my-cli',
            options: {
              flag: {} as any,
            },
          }),
        (err: ValidationError) => {
          assert.equal(err.path, 'config.options.flag.type');
          assert.match(err.message, /must be a string/);
          return true;
        },
      );
    });

    it('validates string option', () => {
      assert.doesNotThrow(() =>
        validateConfig({
          name: 'my-cli',
          options: {
            name: opt.string({ default: 'world' }),
          },
        }),
      );

      assert.throws(
        () =>
          validateConfig({
            name: 'my-cli',
            options: {
              name: { default: 123, type: 'string' } as any,
            },
          }),
        (err: ValidationError) => {
          assert.equal(err.path, 'config.options.name.default');
          assert.match(err.message, /must be a string/);
          return true;
        },
      );
    });

    it('validates boolean option', () => {
      assert.doesNotThrow(() =>
        validateConfig({
          name: 'my-cli',
          options: {
            verbose: opt.boolean({ default: false }),
          },
        }),
      );

      assert.throws(
        () =>
          validateConfig({
            name: 'my-cli',
            options: {
              verbose: { default: 'yes', type: 'boolean' } as any,
            },
          }),
        (err: ValidationError) => {
          assert.equal(err.path, 'config.options.verbose.default');
          assert.match(err.message, /must be a boolean/);
          return true;
        },
      );
    });

    it('validates number option', () => {
      assert.doesNotThrow(() =>
        validateConfig({
          name: 'my-cli',
          options: {
            count: opt.number({ default: 42 }),
          },
        }),
      );

      assert.throws(
        () =>
          validateConfig({
            name: 'my-cli',
            options: {
              count: { default: '42', type: 'number' } as any,
            },
          }),
        (err: ValidationError) => {
          assert.equal(err.path, 'config.options.count.default');
          assert.match(err.message, /must be a number/);
          return true;
        },
      );
    });

    it('validates count option', () => {
      assert.doesNotThrow(() =>
        validateConfig({
          name: 'my-cli',
          options: {
            verbose: opt.count({ default: 0 }),
          },
        }),
      );

      assert.throws(
        () =>
          validateConfig({
            name: 'my-cli',
            options: {
              verbose: { default: 'many', type: 'count' } as any,
            },
          }),
        (err: ValidationError) => {
          assert.equal(err.path, 'config.options.verbose.default');
          assert.match(err.message, /must be a number/);
          return true;
        },
      );
    });

    it('validates enum option choices', () => {
      assert.doesNotThrow(() =>
        validateConfig({
          name: 'my-cli',
          options: {
            level: opt.enum(['low', 'medium', 'high'] as const),
          },
        }),
      );

      assert.throws(
        () =>
          validateConfig({
            name: 'my-cli',
            options: {
              level: { type: 'enum' } as any,
            },
          }),
        (err: ValidationError) => {
          assert.equal(err.path, 'config.options.level.choices');
          assert.match(err.message, /must be a non-empty array/);
          return true;
        },
      );

      assert.throws(
        () =>
          validateConfig({
            name: 'my-cli',
            options: {
              level: { choices: [], type: 'enum' } as any,
            },
          }),
        (err: ValidationError) => {
          assert.equal(err.path, 'config.options.level.choices');
          assert.match(err.message, /must not be empty/);
          return true;
        },
      );
    });

    it('validates enum option default is in choices', () => {
      assert.doesNotThrow(() =>
        validateConfig({
          name: 'my-cli',
          options: {
            level: opt.enum(['low', 'medium', 'high'] as const, {
              default: 'medium',
            }),
          },
        }),
      );

      assert.throws(
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
        (err: ValidationError) => {
          assert.equal(err.path, 'config.options.level.default');
          assert.match(err.message, /must be one of the choices/);
          return true;
        },
      );
    });

    it('validates array option items', () => {
      assert.doesNotThrow(() =>
        validateConfig({
          name: 'my-cli',
          options: {
            files: opt.array('string'),
            ports: opt.array('number'),
          },
        }),
      );

      assert.throws(
        () =>
          validateConfig({
            name: 'my-cli',
            options: {
              files: { items: 'boolean', type: 'array' } as any,
            },
          }),
        (err: ValidationError) => {
          assert.equal(err.path, 'config.options.files.items');
          assert.match(err.message, /"string" or "number"/);
          return true;
        },
      );
    });

    it('validates array option default matches items type', () => {
      assert.doesNotThrow(() =>
        validateConfig({
          name: 'my-cli',
          options: {
            files: opt.array('string', { default: ['a.txt', 'b.txt'] }),
            ports: opt.array('number', { default: [80, 443] }),
          },
        }),
      );

      assert.throws(
        () =>
          validateConfig({
            name: 'my-cli',
            options: {
              files: { default: [1, 2, 3], items: 'string', type: 'array' },
            },
          }),
        (err: ValidationError) => {
          assert.equal(err.path, 'config.options.files.default');
          assert.match(err.message, /must be an array of strings/);
          return true;
        },
      );

      assert.throws(
        () =>
          validateConfig({
            name: 'my-cli',
            options: {
              ports: { default: ['80', '443'], items: 'number', type: 'array' },
            },
          }),
        (err: ValidationError) => {
          assert.equal(err.path, 'config.options.ports.default');
          assert.match(err.message, /must be an array of numbers/);
          return true;
        },
      );
    });

    it('validates aliases are single characters', () => {
      assert.doesNotThrow(() =>
        validateConfig({
          name: 'my-cli',
          options: {
            verbose: opt.boolean({ aliases: ['v'] }),
          },
        }),
      );

      assert.throws(
        () =>
          validateConfig({
            name: 'my-cli',
            options: {
              verbose: { aliases: ['verbose'], type: 'boolean' },
            },
          }),
        (err: ValidationError) => {
          assert.equal(err.path, 'config.options.verbose.aliases[0]');
          assert.match(err.message, /must be a single character/);
          return true;
        },
      );
    });

    it('detects duplicate aliases across options', () => {
      assert.throws(
        () =>
          validateConfig({
            name: 'my-cli',
            options: {
              debug: { aliases: ['v'], type: 'boolean' },
              verbose: { aliases: ['v'], type: 'boolean' },
            },
          }),
        (err: ValidationError) => {
          // Second option to be validated will fail
          assert.match(err.message, /alias "v" is already used/);
          return true;
        },
      );
    });

    it('validates option description is a string', () => {
      assert.throws(
        () =>
          validateConfig({
            name: 'my-cli',
            options: {
              verbose: { description: 123, type: 'boolean' } as any,
            },
          }),
        (err: ValidationError) => {
          assert.equal(err.path, 'config.options.verbose.description');
          assert.match(err.message, /must be a string/);
          return true;
        },
      );
    });

    it('validates option group is a string', () => {
      assert.throws(
        () =>
          validateConfig({
            name: 'my-cli',
            options: {
              verbose: { group: true, type: 'boolean' } as any,
            },
          }),
        (err: ValidationError) => {
          assert.equal(err.path, 'config.options.verbose.group');
          assert.match(err.message, /must be a string/);
          return true;
        },
      );
    });

    it('validates option hidden is a boolean', () => {
      assert.throws(
        () =>
          validateConfig({
            name: 'my-cli',
            options: {
              verbose: { hidden: 'yes', type: 'boolean' } as any,
            },
          }),
        (err: ValidationError) => {
          assert.equal(err.path, 'config.options.verbose.hidden');
          assert.match(err.message, /must be a boolean/);
          return true;
        },
      );
    });

    it('validates option required is a boolean', () => {
      assert.throws(
        () =>
          validateConfig({
            name: 'my-cli',
            options: {
              name: { required: 'yes', type: 'string' } as any,
            },
          }),
        (err: ValidationError) => {
          assert.equal(err.path, 'config.options.name.required');
          assert.match(err.message, /must be a boolean/);
          return true;
        },
      );
    });
  });

  describe('positionals schema validation', () => {
    it('validates positionals is an array', () => {
      assert.throws(
        () =>
          validateConfig({
            name: 'my-cli',
            positionals: 'not-an-array' as any,
          }),
        (err: ValidationError) => {
          assert.equal(err.path, 'config.positionals');
          assert.match(err.message, /must be an array/);
          return true;
        },
      );
    });

    it('validates positional type discriminator', () => {
      assert.throws(
        () =>
          validateConfig({
            name: 'my-cli',
            positionals: [{ type: 'invalid' }] as any,
          }),
        (err: ValidationError) => {
          assert.equal(err.path, 'config.positionals[0].type');
          assert.match(err.message, /must be one of/);
          return true;
        },
      );
    });

    it('validates string positional', () => {
      assert.doesNotThrow(() =>
        validateConfig({
          name: 'my-cli',
          positionals: [opt.stringPos({ default: 'value' })],
        }),
      );

      assert.throws(
        () =>
          validateConfig({
            name: 'my-cli',
            positionals: [{ default: 123, type: 'string' }] as any,
          }),
        (err: ValidationError) => {
          assert.equal(err.path, 'config.positionals[0].default');
          assert.match(err.message, /must be a string/);
          return true;
        },
      );
    });

    it('validates number positional', () => {
      assert.doesNotThrow(() =>
        validateConfig({
          name: 'my-cli',
          positionals: [opt.numberPos({ default: 42 })],
        }),
      );

      assert.throws(
        () =>
          validateConfig({
            name: 'my-cli',
            positionals: [{ default: '42', type: 'number' }] as any,
          }),
        (err: ValidationError) => {
          assert.equal(err.path, 'config.positionals[0].default');
          assert.match(err.message, /must be a number/);
          return true;
        },
      );
    });

    it('validates enum positional choices', () => {
      assert.doesNotThrow(() =>
        validateConfig({
          name: 'my-cli',
          positionals: [opt.enumPos(['a', 'b', 'c'] as const)],
        }),
      );

      assert.throws(
        () =>
          validateConfig({
            name: 'my-cli',
            positionals: [{ choices: [], type: 'enum' }] as any,
          }),
        (err: ValidationError) => {
          assert.equal(err.path, 'config.positionals[0].choices');
          assert.match(err.message, /must not be empty/);
          return true;
        },
      );
    });

    it('validates enum positional default is in choices', () => {
      assert.throws(
        () =>
          validateConfig({
            name: 'my-cli',
            positionals: [
              { choices: ['a', 'b', 'c'], default: 'd', type: 'enum' },
            ],
          }),
        (err: ValidationError) => {
          assert.equal(err.path, 'config.positionals[0].default');
          assert.match(err.message, /must be one of the choices/);
          return true;
        },
      );
    });

    it('validates variadic positional items', () => {
      assert.doesNotThrow(() =>
        validateConfig({
          name: 'my-cli',
          positionals: [opt.variadic('string')],
        }),
      );

      assert.throws(
        () =>
          validateConfig({
            name: 'my-cli',
            positionals: [{ items: 'boolean', type: 'variadic' }] as any,
          }),
        (err: ValidationError) => {
          assert.equal(err.path, 'config.positionals[0].items');
          assert.match(err.message, /"string" or "number"/);
          return true;
        },
      );
    });

    it('validates variadic positional is last', () => {
      assert.throws(
        () =>
          validateConfig({
            name: 'my-cli',
            positionals: [opt.variadic('string'), opt.stringPos()],
          }),
        (err: ValidationError) => {
          assert.equal(err.path, 'config.positionals[0]');
          assert.match(err.message, /variadic positional must be the last/);
          return true;
        },
      );
    });

    it('validates required positionals do not follow optional', () => {
      assert.throws(
        () =>
          validateConfig({
            name: 'my-cli',
            positionals: [
              opt.stringPos(), // optional
              opt.stringPos({ required: true }), // required - invalid!
            ],
          }),
        (err: ValidationError) => {
          assert.equal(err.path, 'config.positionals[1]');
          assert.match(
            err.message,
            /required positional cannot follow an optional/,
          );
          return true;
        },
      );
    });

    it('allows optional after required', () => {
      assert.doesNotThrow(() =>
        validateConfig({
          name: 'my-cli',
          positionals: [
            opt.stringPos({ required: true }),
            opt.stringPos(), // optional - valid
          ],
        }),
      );
    });

    it('validates positional description is a string', () => {
      assert.throws(
        () =>
          validateConfig({
            name: 'my-cli',
            positionals: [{ description: 123, type: 'string' }] as any,
          }),
        (err: ValidationError) => {
          assert.equal(err.path, 'config.positionals[0].description');
          assert.match(err.message, /must be a string/);
          return true;
        },
      );
    });

    it('validates positional name is a string', () => {
      assert.throws(
        () =>
          validateConfig({
            name: 'my-cli',
            positionals: [{ name: 123, type: 'string' }] as any,
          }),
        (err: ValidationError) => {
          assert.equal(err.path, 'config.positionals[0].name');
          assert.match(err.message, /must be a string/);
          return true;
        },
      );
    });

    it('validates positional required is a boolean', () => {
      assert.throws(
        () =>
          validateConfig({
            name: 'my-cli',
            positionals: [{ required: 'yes', type: 'string' }] as any,
          }),
        (err: ValidationError) => {
          assert.equal(err.path, 'config.positionals[0].required');
          assert.match(err.message, /must be a boolean/);
          return true;
        },
      );
    });
  });

  describe('simple CLI handler validation', () => {
    it('accepts function handler', () => {
      assert.doesNotThrow(() =>
        validateConfig({
          handler: () => {},
          name: 'my-cli',
        }),
      );
    });

    it('accepts array of function handlers', () => {
      assert.doesNotThrow(() =>
        validateConfig({
          handler: [() => {}, () => {}],
          name: 'my-cli',
        }),
      );
    });

    it('rejects non-function handler', () => {
      assert.throws(
        () =>
          validateConfig({
            handler: 'not-a-function' as any,
            name: 'my-cli',
          }),
        (err: ValidationError) => {
          assert.equal(err.path, 'config.handler');
          assert.match(err.message, /must be a function/);
          return true;
        },
      );
    });

    it('rejects empty handler array', () => {
      assert.throws(
        () =>
          validateConfig({
            handler: [] as any,
            name: 'my-cli',
          }),
        (err: ValidationError) => {
          assert.equal(err.path, 'config.handler');
          assert.match(err.message, /must not be empty/);
          return true;
        },
      );
    });

    it('rejects array with non-function element', () => {
      assert.throws(
        () =>
          validateConfig({
            handler: [() => {}, 'not-a-function'] as any,
            name: 'my-cli',
          }),
        (err: ValidationError) => {
          assert.equal(err.path, 'config.handler[1]');
          assert.match(err.message, /must be a function/);
          return true;
        },
      );
    });
  });

  describe('command-based CLI validation', () => {
    it('validates commands is required and non-empty', () => {
      assert.throws(
        () =>
          validateConfig({
            commands: {},
            name: 'my-cli',
          } as any),
        (err: ValidationError) => {
          assert.equal(err.path, 'config.commands');
          assert.match(err.message, /must have at least one command/);
          return true;
        },
      );
    });

    it('validates command description is required', () => {
      assert.throws(
        () =>
          validateConfig({
            commands: {
              greet: { handler: () => {} } as any,
            },
            name: 'my-cli',
          }),
        (err: ValidationError) => {
          assert.equal(err.path, 'config.commands.greet.description');
          assert.match(err.message, /must be a string/);
          return true;
        },
      );
    });

    it('validates command handler is required', () => {
      assert.throws(
        () =>
          validateConfig({
            commands: {
              greet: { description: 'Say hi' } as any,
            },
            name: 'my-cli',
          }),
        (err: ValidationError) => {
          assert.equal(err.path, 'config.commands.greet.handler');
          assert.match(err.message, /is required/);
          return true;
        },
      );
    });

    it('validates command options', () => {
      assert.throws(
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
        (err: ValidationError) => {
          assert.equal(err.path, 'config.commands.greet.options.name.type');
          return true;
        },
      );
    });

    it('validates command positionals', () => {
      assert.throws(
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
        (err: ValidationError) => {
          assert.equal(err.path, 'config.commands.greet.positionals[0].type');
          return true;
        },
      );
    });

    it('detects alias collision between global and command options', () => {
      assert.throws(
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
        (err: ValidationError) => {
          assert.match(err.message, /alias "v" is already used/);
          return true;
        },
      );
    });

    it('rejects top-level positionals in command-based CLI', () => {
      assert.throws(
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
        (err: ValidationError) => {
          assert.equal(err.path, 'config.positionals');
          assert.match(
            err.message,
            /top-level positionals are not allowed in command-based CLIs/,
          );
          return true;
        },
      );
    });

    it('rejects top-level handler in command-based CLI', () => {
      assert.throws(
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
        (err: ValidationError) => {
          assert.equal(err.path, 'config.handler');
          assert.match(err.message, /use defaultHandler/);
          return true;
        },
      );
    });

    it('validates defaultHandler as function', () => {
      assert.doesNotThrow(() =>
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
      );
    });

    it('validates defaultHandler as command name string', () => {
      assert.doesNotThrow(() =>
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
      );
    });

    it('rejects defaultHandler referencing non-existent command', () => {
      assert.throws(
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
        (err: ValidationError) => {
          assert.equal(err.path, 'config.defaultHandler');
          assert.match(err.message, /must reference an existing command/);
          return true;
        },
      );
    });

    it('rejects invalid defaultHandler type', () => {
      assert.throws(
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
        (err: ValidationError) => {
          assert.equal(err.path, 'config.defaultHandler');
          assert.match(err.message, /must be a function/);
          return true;
        },
      );
    });
  });

  describe('valid complete configs', () => {
    it('accepts valid simple CLI config', () => {
      assert.doesNotThrow(() =>
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
      );
    });

    it('accepts valid command-based CLI config', () => {
      assert.doesNotThrow(() =>
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
      );
    });
  });
});
