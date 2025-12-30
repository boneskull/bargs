// test/help.test.ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { generateCommandHelp, generateHelp } from '../src/help.js';
import { opt } from '../src/opt.js';
import { stripAnsi, themes } from '../src/theme.js';

describe('generateHelp', () => {
  it('generates help with name and description', () => {
    const help = stripAnsi(
      generateHelp({
        description: 'A test CLI',
        name: 'my-cli',
      }),
    );

    assert.ok(help.includes('my-cli'));
    assert.ok(help.includes('A test CLI'));
  });

  it('includes version when provided', () => {
    const help = stripAnsi(
      generateHelp({
        name: 'my-cli',
        version: '1.0.0',
      }),
    );

    assert.ok(help.includes('1.0.0'));
  });

  it('lists options with descriptions', () => {
    const help = stripAnsi(
      generateHelp({
        name: 'my-cli',
        options: {
          verbose: opt.boolean({
            aliases: ['v'],
            description: 'Enable verbose output',
          }),
        },
      }),
    );

    assert.ok(help.includes('--verbose'));
    assert.ok(help.includes('-v'));
    assert.ok(help.includes('Enable verbose output'));
    assert.ok(help.includes('[boolean]'));
  });

  it('shows enum choices', () => {
    const help = stripAnsi(
      generateHelp({
        name: 'my-cli',
        options: {
          level: opt.enum(['low', 'medium', 'high'] as const, {
            description: 'Set level',
          }),
        },
      }),
    );

    assert.ok(help.includes('low | medium | high'));
  });

  it('shows default values', () => {
    const help = stripAnsi(
      generateHelp({
        name: 'my-cli',
        options: {
          name: opt.string({ default: 'world', description: 'Name to greet' }),
        },
      }),
    );

    assert.ok(help.includes('default: "world"'));
  });

  it('hides options marked as hidden', () => {
    const help = stripAnsi(
      generateHelp({
        name: 'my-cli',
        options: {
          secret: opt.boolean({ description: 'Secret option', hidden: true }),
          visible: opt.boolean({ description: 'Visible option' }),
        },
      }),
    );

    assert.ok(help.includes('--visible'));
    assert.ok(!help.includes('--secret'));
  });

  it('shows commands when present', () => {
    const help = stripAnsi(
      generateHelp({
        commands: {
          build: opt.command({
            description: 'Build the thing',
            handler: () => {},
          }),
          run: opt.command({
            description: 'Run the thing',
            handler: () => {},
          }),
        },
        name: 'my-cli',
      }),
    );

    assert.ok(help.includes('COMMANDS'));
    assert.ok(help.includes('run'));
    assert.ok(help.includes('Run the thing'));
    assert.ok(help.includes('build'));
    assert.ok(help.includes('Build the thing'));
  });

  it('groups options by group name', () => {
    const help = stripAnsi(
      generateHelp({
        name: 'my-cli',
        options: {
          port: opt.number({ description: 'Port', group: 'Network' }),
          quiet: opt.boolean({ description: 'Quiet', group: 'Logging' }),
          verbose: opt.boolean({ description: 'Verbose', group: 'Logging' }),
        },
      }),
    );

    assert.ok(help.includes('LOGGING'));
    assert.ok(help.includes('NETWORK'));
  });
});

describe('generateHelp positionals', () => {
  it('shows positionals in usage line with default names', () => {
    const help = stripAnsi(
      generateHelp({
        name: 'my-cli',
        positionals: [opt.stringPos({ required: true }), opt.stringPos()],
      }),
    );

    assert.ok(help.includes('<arg0>'));
    assert.ok(help.includes('[arg1]'));
  });

  it('shows positionals with custom names', () => {
    const help = stripAnsi(
      generateHelp({
        name: 'my-cli',
        positionals: [
          opt.stringPos({ name: 'source', required: true }),
          opt.stringPos({ name: 'dest' }),
        ],
      }),
    );

    assert.ok(help.includes('<source>'));
    assert.ok(help.includes('[dest]'));
  });

  it('shows variadic positionals with ellipsis', () => {
    const help = stripAnsi(
      generateHelp({
        name: 'my-cli',
        positionals: [opt.variadic('string', { name: 'files' })],
      }),
    );

    assert.ok(help.includes('[files...]'));
  });

  it('shows positional with default as required (angle brackets)', () => {
    const help = stripAnsi(
      generateHelp({
        name: 'my-cli',
        positionals: [opt.stringPos({ default: 'foo', name: 'input' })],
      }),
    );

    // Positionals with defaults are considered "required" in terms of display
    // because they always have a value
    assert.ok(help.includes('<input>'));
  });
});

describe('generateCommandHelp', () => {
  it('generates help for a specific command', () => {
    const help = stripAnsi(
      generateCommandHelp(
        {
          commands: {
            greet: opt.command({
              description: 'Greet someone',
              handler: () => {},
              options: {
                name: opt.string({ description: 'Name to greet' }),
              },
            }),
          },
          name: 'my-cli',
          options: {
            verbose: opt.boolean({ description: 'Global verbose' }),
          },
        },
        'greet',
      ),
    );

    assert.ok(help.includes('my-cli greet'));
    assert.ok(help.includes('Greet someone'));
    assert.ok(help.includes('--name'));
    assert.ok(help.includes('GLOBAL OPTIONS'));
    assert.ok(help.includes('--verbose'));
  });

  it('returns error for unknown command', () => {
    const help = generateCommandHelp(
      {
        commands: {
          greet: opt.command({
            description: 'Greet someone',
            handler: () => {},
          }),
        },
        name: 'my-cli',
      },
      'unknown',
    );

    assert.ok(help.includes('Unknown command: unknown'));
  });

  it('shows command positionals with custom names', () => {
    const help = stripAnsi(
      generateCommandHelp(
        {
          commands: {
            copy: opt.command({
              description: 'Copy files',
              handler: () => {},
              positionals: [
                opt.stringPos({ name: 'source', required: true }),
                opt.stringPos({ name: 'dest', required: true }),
              ],
            }),
          },
          name: 'my-cli',
        },
        'copy',
      ),
    );

    assert.ok(help.includes('<source>'));
    assert.ok(help.includes('<dest>'));
  });
});

describe('generateHelp with themes', () => {
  it('uses default theme when no theme provided', () => {
    const config = {
      description: 'A test application',
      name: 'test-app',
      options: {
        verbose: { description: 'Verbose output', type: 'boolean' as const },
      },
    };
    const help = generateHelp(config);
    // Should have brightMagenta section headers (default theme)
    assert.ok(help.includes('\x1b[95m')); // brightMagenta for USAGE
  });

  it('uses mono theme for no colors', () => {
    const config = {
      name: 'test-app',
      options: {
        verbose: { description: 'Verbose output', type: 'boolean' as const },
      },
    };
    const help = generateHelp(config, themes.mono);
    // Should have no ANSI codes
    assert.ok(!help.includes('\x1b['));
  });

  it('applies custom theme colors', () => {
    const customTheme = {
      colors: {
        command: '',
        defaultValue: '',
        description: '',
        example: '',
        flag: '',
        positional: '',
        scriptName: '\x1b[35m', // magenta
        sectionHeader: '\x1b[34m', // blue
        type: '',
        usage: '',
      },
    };
    const config = {
      name: 'test-app',
      options: {},
    };
    const help = generateHelp(config, customTheme);
    assert.ok(help.includes('\x1b[35m')); // magenta script name
    assert.ok(help.includes('\x1b[34m')); // blue section header
  });
});

describe('generateHelp with positionals', () => {
  it('shows positionals in usage line', () => {
    const config = {
      name: 'test-app',
      options: {},
      positionals: [
        { description: 'Input file', required: true, type: 'string' as const },
      ],
    };
    const help = stripAnsi(generateHelp(config));
    // Should show positional in usage line
    assert.ok(help.includes('<arg0>'));
  });

  it('shows POSITIONALS section when positionals defined', () => {
    const config = {
      name: 'test-app',
      options: {},
      positionals: [
        { description: 'Input file', required: true, type: 'string' as const },
        { description: 'Output file', type: 'string' as const },
      ],
    };
    const help = stripAnsi(generateHelp(config));
    assert.ok(help.includes('POSITIONALS'));
    assert.ok(help.includes('Input file'));
    assert.ok(help.includes('Output file'));
  });

  it('applies positional color from theme', () => {
    const customTheme = {
      colors: {
        command: '',
        defaultValue: '',
        description: '',
        example: '',
        flag: '',
        positional: '\x1b[33m', // yellow
        scriptName: '',
        sectionHeader: '',
        type: '',
        usage: '',
      },
    };
    const config = {
      name: 'test-app',
      options: {},
      positionals: [
        { description: 'Input file', required: true, type: 'string' as const },
      ],
    };
    const help = generateHelp(config, customTheme);
    assert.ok(help.includes('\x1b[33m')); // positional color applied
  });
});
