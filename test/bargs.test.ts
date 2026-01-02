// test/bargs.test.ts
import { expect, expectAsync } from 'bupkis';
import { describe, it } from 'node:test';

import type { Theme } from '../src/theme.js';

import { bargs, bargsAsync } from '../src/bargs.js';
import { BargsError } from '../src/errors.js';
import { opt } from '../src/opt.js';

describe('bargs (sync)', () => {
  it('parses simple CLI and returns result', () => {
    const result = bargs({
      args: ['--name', 'Alice'],
      name: 'test-cli',
      options: {
        name: opt.string({ default: 'world' }),
      },
    });

    expect(result.values, 'to deeply equal', { name: 'Alice' });
  });

  it('calls handler for simple CLI', () => {
    let handlerResult: { values: { name: string } };

    bargs({
      args: ['--name', 'Bob'],
      handler: (result) => {
        handlerResult = result;
      },
      name: 'test-cli',
      options: {
        name: opt.string({ default: 'world' }),
      },
    });

    expect(handlerResult!.values, 'to deeply equal', {
      name: 'Bob',
    });
  });

  it('parses command-based CLI', () => {
    let handlerResult: { command: string; values: { name: string } };

    bargs({
      args: ['greet', '--name', 'Charlie'],
      commands: {
        greet: opt.command({
          description: 'Greet someone',
          handler: (result) => {
            handlerResult = result;
          },
          options: {
            name: opt.string({ default: 'world' }),
          },
        }),
      },
      name: 'test-cli',
    });

    expect(handlerResult!, 'to satisfy', {
      command: 'greet',
      values: {
        name: 'Charlie',
      },
    });
  });

  it('returns result with command undefined for simple CLI', () => {
    const result = bargs({
      args: [],
      name: 'test-cli',
      options: {
        verbose: opt.boolean(),
      },
    });

    expect(result.command, 'to be', undefined);
  });

  it('applies defaults when no args provided', () => {
    const result = bargs({
      args: [],
      name: 'test-cli',
      options: {
        count: opt.number({ default: 42 }),
        name: opt.string({ default: 'default-name' }),
      },
    });

    expect(result.values, 'to deeply equal', {
      count: 42,
      name: 'default-name',
    });
  });

  it('parses positionals for simple CLI', () => {
    const result = bargs({
      args: ['hello'],
      name: 'test-cli',
      positionals: [opt.stringPos({ required: true })],
    });

    expect(result.positionals, 'to deeply equal', ['hello']);
  });

  it('throws when sync handler returns a thenable', () => {
    expect(
      () => {
        bargs({
          args: ['--name', 'Test'],
          handler: async () => {
            // Async handler returns a thenable
          },
          name: 'test-cli',
          options: {
            name: opt.string({ default: 'world' }),
          },
        });
      },
      'to throw a',
      BargsError,
      'satisfying',
      { message: /thenable/ },
    );
  });

  it('throws when command sync handler returns a thenable', () => {
    expect(
      () => {
        bargs({
          args: ['greet'],
          commands: {
            greet: opt.command({
              description: 'Greet',
              handler: async () => {
                // Async handler
              },
            }),
          },
          name: 'test-cli',
        });
      },
      'to throw a',
      BargsError,
      'satisfying',
      { message: /thenable/ },
    );
  });

  it('allows user to override --help with custom option', () => {
    let customHelpCalled = false;

    const result = bargs({
      args: ['--help'],
      handler: () => {
        customHelpCalled = true;
      },
      name: 'test-cli',
      options: {
        help: opt.boolean({ description: 'My custom help' }),
      },
    });

    // Should parse --help as a regular boolean option, not trigger built-in help
    expect(result.values.help, 'to be', true);
    expect(customHelpCalled, 'to be', true);
  });

  it('allows user to override -h alias with custom option', () => {
    const result = bargs({
      args: ['-h'],
      name: 'test-cli',
      options: {
        verbose: opt.boolean({ aliases: ['h'] }), // Using 'h' for verbose
      },
    });

    // Should parse -h as verbose, not trigger built-in help
    expect(result.values.verbose, 'to be', true);
  });

  it('allows user to override --version with custom option', () => {
    const result = bargs({
      args: ['--version'],
      name: 'test-cli',
      options: {
        version: opt.boolean({ description: 'My custom version flag' }),
      },
    });

    // Should parse --version as a regular boolean option
    expect(result.values.version, 'to be', true);
  });
});

describe('bargsAsync', () => {
  it('parses simple CLI and returns result', async () => {
    await expectAsync(
      bargsAsync({
        args: ['--name', 'Alice'],
        name: 'test-cli',
        options: {
          name: opt.string({ default: 'world' }),
        },
      }),
      'to resolve with value satisfying',
      { values: { name: 'Alice' } },
    );
  });

  it('calls async handler for simple CLI', async () => {
    let handlerResult: { values: { name: string } };

    await expectAsync(
      bargsAsync({
        args: ['--name', 'Bob'],
        handler: async (result) => {
          // Simulate async work
          await Promise.resolve();
          handlerResult = result;
        },
        name: 'test-cli',
        options: {
          name: opt.string({ default: 'world' }),
        },
      }),
      'to resolve',
    );

    expect(handlerResult!.values, 'to deeply equal', {
      name: 'Bob',
    });
  });
});

describe('bargs with options (second parameter)', () => {
  it('accepts theme by name in options', () => {
    const result = bargs(
      {
        args: ['--foo', 'bar'],
        name: 'test',
        options: { foo: { type: 'string' } },
      },
      { theme: 'mono' },
    );
    expect(result.values.foo, 'to be', 'bar');
  });

  it('accepts custom theme object in options', () => {
    const customTheme: Theme = {
      colors: {
        command: '',
        defaultValue: '',
        description: '',
        example: '',
        flag: '',
        positional: '',
        scriptName: '\x1b[35m',
        sectionHeader: '',
        type: '',
        usage: '',
      },
    };
    const result = bargs(
      {
        args: ['--foo', 'bar'],
        name: 'test',
        options: { foo: { type: 'string' } },
      },
      { theme: customTheme },
    );
    expect(result.values.foo, 'to be', 'bar');
  });

  it('works without options parameter', () => {
    const result = bargs({
      args: ['--foo', 'bar'],
      name: 'test',
      options: { foo: { type: 'string' } },
    });
    expect(result.values.foo, 'to be', 'bar');
  });
});

describe('bargsAsync with options (second parameter)', () => {
  it('accepts theme by name in options', async () => {
    await expectAsync(
      bargsAsync(
        {
          args: ['--foo', 'bar'],
          name: 'test',
          options: { foo: { type: 'string' } },
        },
        { theme: 'mono' },
      ),
      'to resolve with value satisfying',
      {
        values: {
          foo: 'bar',
        },
      },
    );
  });

  it('accepts custom theme object in options', async () => {
    const customTheme: Theme = {
      colors: {
        command: '',
        defaultValue: '',
        description: '',
        example: '',
        flag: '',
        positional: '',
        scriptName: '\x1b[35m',
        sectionHeader: '',
        type: '',
        usage: '',
      },
    };

    await expectAsync(
      bargsAsync(
        {
          args: ['--foo', 'bar'],
          name: 'test',
          options: { foo: { type: 'string' } },
        },
        { theme: customTheme },
      ),
      'to resolve with value satisfying',
      {
        values: {
          foo: 'bar',
        },
      },
    );
  });

  it('works without options parameter', async () => {
    await expectAsync(
      bargsAsync({
        args: ['--foo', 'bar'],
        name: 'test',
        options: { foo: { type: 'string' } },
      }),
      'to resolve with value satisfying',
      {
        values: {
          foo: 'bar',
        },
      },
    );
  });
});
