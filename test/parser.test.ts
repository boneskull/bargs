// test/parser.test.ts
import { expect, expectAsync } from 'bupkis';
import { describe, it } from 'node:test';

import { opt } from '../src/opt.js';
import { parseCommandsAsync, parseSimple } from '../src/parser.js';
import { validateConfig } from '../src/validate.js';

describe('parseCommands', () => {
  it('parses a command with options', async () => {
    const result = await parseCommandsAsync({
      args: ['greet', '--name', 'world'],
      commands: {
        greet: opt.command({
          description: 'Greet someone',
          handler: () => {},
          options: {
            name: opt.string({ default: 'stranger' }),
          },
        }),
      },
      name: 'test-cli',
    });

    expect(result.command, 'to be', 'greet');
    expect(result.values, 'to deeply equal', { name: 'world' });
  });

  it('parses command positionals', async () => {
    const result = await parseCommandsAsync({
      args: ['greet', 'Alice'],
      commands: {
        greet: opt.command({
          description: 'Greet someone',
          handler: () => {},
          positionals: [opt.stringPos({ required: true })],
        }),
      },
      name: 'test-cli',
    });

    expect(result.positionals, 'to deeply equal', ['Alice']);
  });

  it('calls command handler', async () => {
    let called = false;
    await parseCommandsAsync({
      args: ['greet'],
      commands: {
        greet: opt.command({
          description: 'Greet someone',
          handler: () => {
            called = true;
          },
        }),
      },
      name: 'test-cli',
    });

    expect(called, 'to be', true);
  });

  it('uses defaultHandler when no command given', async () => {
    let called = false;
    await parseCommandsAsync({
      args: [],
      commands: {
        greet: opt.command({
          description: 'Greet someone',
          handler: () => {},
        }),
      },
      defaultHandler: () => {
        called = true;
      },
      name: 'test-cli',
    });

    expect(called, 'to be', true);
  });

  it('throws on unknown command', async () => {
    await expectAsync(
      parseCommandsAsync({
        args: ['unknown'],
        commands: {
          greet: opt.command({
            description: 'Greet someone',
            handler: () => {},
          }),
        },
        name: 'test-cli',
      }),
      'to reject with error satisfying',
      /Unknown command/,
    );
  });

  it('merges global and command options', async () => {
    const result = await parseCommandsAsync({
      args: ['greet', '--verbose', '--name', 'world'],
      commands: {
        greet: opt.command({
          description: 'Greet someone',
          handler: () => {},
          options: {
            name: opt.string({ default: 'stranger' }),
          },
        }),
      },
      name: 'test-cli',
      options: {
        verbose: opt.boolean(),
      },
    });

    expect(result.values, 'to deeply equal', { name: 'world', verbose: true });
  });

  it('uses named default command when no command given', async () => {
    let handlerCalled = false;
    await parseCommandsAsync({
      args: [],
      commands: {
        greet: opt.command({
          description: 'Greet someone',
          handler: () => {
            handlerCalled = true;
          },
        }),
      },
      defaultHandler: 'greet',
      name: 'test-cli',
    });

    expect(handlerCalled, 'to be', true);
  });
});

describe('parseSimple', () => {
  it('parses string options', () => {
    const result = parseSimple({
      args: ['--name', 'foo'],
      options: {
        name: opt.string({ default: 'world' }),
      },
    });

    expect(result.values, 'to deeply equal', { name: 'foo' });
  });

  it('parses boolean options', () => {
    const result = parseSimple({
      args: ['--verbose'],
      options: {
        verbose: opt.boolean({ default: false }),
      },
    });

    expect(result.values, 'to deeply equal', { verbose: true });
  });

  it('parses number options', () => {
    const result = parseSimple({
      args: ['--count', '5'],
      options: {
        count: opt.number({ default: 0 }),
      },
    });

    expect(result.values, 'to deeply equal', { count: 5 });
  });

  it('applies defaults', () => {
    const result = parseSimple({
      args: [],
      options: {
        name: opt.string({ default: 'default-name' }),
        verbose: opt.boolean({ default: false }),
      },
    });

    expect(result.values, 'to deeply equal', {
      name: 'default-name',
      verbose: false,
    });
  });

  it('parses short aliases', () => {
    const result = parseSimple({
      args: ['-v'],
      options: {
        verbose: opt.boolean({ aliases: ['v'] }),
      },
    });

    expect(result.values, 'to deeply equal', { verbose: true });
  });

  it('returns undefined for options without defaults', () => {
    const result = parseSimple({
      args: [],
      options: {
        name: opt.string(),
      },
    });

    expect(result.values.name, 'to be', undefined);
  });

  it('parses enum options', () => {
    const result = parseSimple({
      args: ['--level', 'high'],
      options: {
        level: opt.enum(['low', 'medium', 'high'] as const, {
          default: 'medium',
        }),
      },
    });

    expect(result.values.level, 'to be', 'high');
  });

  it('validates enum choices', () => {
    expect(
      () => {
        parseSimple({
          args: ['--level', 'invalid'],
          options: {
            level: opt.enum(['low', 'medium', 'high'] as const),
          },
        });
      },
      'to throw',
      /Invalid value.*level.*must be one of/i,
    );
  });

  it('parses array options', () => {
    const result = parseSimple({
      args: ['--files', 'a.txt', '--files', 'b.txt'],
      options: {
        files: opt.array('string'),
      },
    });

    expect(result.values.files, 'to deeply equal', ['a.txt', 'b.txt']);
  });

  it('parses number array options', () => {
    const result = parseSimple({
      args: ['--ports', '80', '--ports', '443'],
      options: {
        ports: opt.array('number'),
      },
    });

    expect(result.values.ports, 'to deeply equal', [80, 443]);
  });
});

describe('parseSimple positionals', () => {
  it('parses string positionals', () => {
    const result = parseSimple({
      args: ['hello'],
      positionals: [opt.stringPos({ required: true })],
    });

    expect(result.positionals, 'to deeply equal', ['hello']);
  });

  it('parses number positionals', () => {
    const result = parseSimple({
      args: ['42'],
      positionals: [opt.numberPos({ required: true })],
    });

    expect(result.positionals, 'to deeply equal', [42]);
  });

  it('parses variadic positionals', () => {
    const result = parseSimple({
      args: ['first', 'second', 'third'],
      positionals: [opt.stringPos({ required: true }), opt.variadic('string')],
    });

    expect(result.positionals, 'to deeply equal', [
      'first',
      ['second', 'third'],
    ]);
  });

  it('applies positional defaults', () => {
    const result = parseSimple({
      args: [],
      positionals: [opt.stringPos({ default: 'default-value' })],
    });

    expect(result.positionals, 'to deeply equal', ['default-value']);
  });

  it('throws on missing required positional', () => {
    expect(
      () => {
        parseSimple({
          args: [],
          positionals: [opt.stringPos({ required: true })],
        });
      },
      'to throw',
      /Missing required positional/,
    );
  });

  it('parses number variadic positionals', () => {
    const result = parseSimple({
      args: ['1', '2', '3'],
      positionals: [opt.variadic('number')],
    });

    expect(result.positionals, 'to deeply equal', [[1, 2, 3]]);
  });

  it('throws if variadic is not the last positional', () => {
    // Validation is done by validateConfig in bargs(), not parseSimple
    // See validate.test.ts for comprehensive validation tests
    expect(
      () => {
        validateConfig({
          name: 'test',
          positionals: [opt.variadic('string'), opt.stringPos()],
        });
      },
      'to throw',
      /variadic positional must be the last/i,
    );
  });

  it('parses enum positionals', () => {
    const result = parseSimple({
      args: ['high'],
      positionals: [opt.enumPos(['low', 'medium', 'high'] as const)],
    });

    expect(result.positionals, 'to deeply equal', ['high']);
  });

  it('applies enum positional defaults', () => {
    const result = parseSimple({
      args: [],
      positionals: [
        opt.enumPos(['low', 'medium', 'high'] as const, { default: 'medium' }),
      ],
    });

    expect(result.positionals, 'to deeply equal', ['medium']);
  });

  it('validates enum positional choices', () => {
    expect(
      () => {
        parseSimple({
          args: ['invalid'],
          positionals: [opt.enumPos(['low', 'medium', 'high'] as const)],
        });
      },
      'to throw',
      /Invalid value.*positional.*must be one of/i,
    );
  });

  it('throws on missing required enum positional', () => {
    expect(
      () => {
        parseSimple({
          args: [],
          positionals: [
            opt.enumPos(['low', 'medium', 'high'] as const, { required: true }),
          ],
        });
      },
      'to throw',
      /Missing required positional/,
    );
  });

  it('throws if required positional follows optional positional', () => {
    // Validation is done by validateConfig in bargs(), not parseSimple
    // See validate.test.ts for comprehensive validation tests
    expect(
      () => {
        validateConfig({
          name: 'test',
          positionals: [
            opt.stringPos(), // optional (no required, no default)
            opt.stringPos({ required: true }), // required - ERROR
          ],
        });
      },
      'to throw',
      /required positional cannot follow an optional/i,
    );
  });

  it('allows required positional after positional with default', () => {
    // This is valid: default provides a value, so it's not truly "optional"
    const result = parseSimple({
      args: ['override', 'required-value'],
      positionals: [
        opt.stringPos({ default: 'default-value' }),
        opt.stringPos({ required: true }),
      ],
    });

    expect(result.positionals, 'to deeply equal', [
      'override',
      'required-value',
    ]);
  });

  it('allows multiple optional positionals in sequence', () => {
    const result = parseSimple({
      args: ['first'],
      positionals: [opt.stringPos(), opt.stringPos(), opt.stringPos()],
    });

    expect(result.positionals, 'to deeply equal', [
      'first',
      undefined,
      undefined,
    ]);
  });
});
