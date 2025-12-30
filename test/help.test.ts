// test/help.test.ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { generateCommandHelp, generateHelp } from '../src/help.js';
import { opt } from '../src/opt.js';
import { stripAnsi, themes } from '../src/theme.js';

// Note: Default epilog reads from package.json, which exists in this project.
// Tests that verify default epilog behavior will see actual package.json values.

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
      epilog: false as const,
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
      epilog: false as const,
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
      epilog: false as const,
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

describe('generateHelp epilog', () => {
  it('shows custom epilog when provided', () => {
    const config = {
      epilog: 'Thanks for using my CLI!',
      name: 'test-app',
    };
    const help = stripAnsi(generateHelp(config, themes.mono));
    assert.ok(help.includes('Thanks for using my CLI!'));
  });

  it('disables epilog when set to false', () => {
    const config = {
      epilog: false as const,
      name: 'test-app',
    };
    const help = stripAnsi(generateHelp(config, themes.mono));
    // Should not contain Homepage or Repository (default epilog)
    assert.ok(!help.includes('Homepage:'));
    assert.ok(!help.includes('Repository:'));
  });

  it('disables epilog when set to empty string', () => {
    const config = {
      epilog: '',
      name: 'test-app',
    };
    const help = stripAnsi(generateHelp(config, themes.mono));
    // Should not contain Homepage or Repository (default epilog)
    assert.ok(!help.includes('Homepage:'));
    assert.ok(!help.includes('Repository:'));
  });

  it('shows default epilog from package.json when epilog not specified', () => {
    const config = {
      name: 'test-app',
    };
    const help = stripAnsi(generateHelp(config, themes.mono));
    // This test runs in the bargs repo, which has repository in package.json
    // So we expect to see either Homepage or Repository
    const hasEpilog =
      help.includes('Homepage:') || help.includes('Repository:');
    assert.ok(hasEpilog, 'Expected default epilog from package.json');
  });

  it('linkifies URLs in custom epilog when hyperlinks supported', () => {
    const originalEnv = process.env.FORCE_HYPERLINK;
    try {
      process.env.FORCE_HYPERLINK = '1';
      const config = {
        epilog: 'Visit https://example.com for docs',
        name: 'test-app',
      };
      const help = generateHelp(config, themes.mono);
      // Should contain OSC 8 hyperlink sequences
      assert.ok(help.includes('\x1b]8;;https://example.com'));
    } finally {
      if (originalEnv === undefined) {
        delete process.env.FORCE_HYPERLINK;
      } else {
        process.env.FORCE_HYPERLINK = originalEnv;
      }
    }
  });

  it('linkifies URLs in description when hyperlinks supported', () => {
    const originalEnv = process.env.FORCE_HYPERLINK;
    try {
      process.env.FORCE_HYPERLINK = '1';
      const config = {
        description: 'See https://docs.example.com for help',
        epilog: false as const,
        name: 'test-app',
      };
      const help = generateHelp(config, themes.mono);
      // Should contain OSC 8 hyperlink sequences
      assert.ok(help.includes('\x1b]8;;https://docs.example.com'));
    } finally {
      if (originalEnv === undefined) {
        delete process.env.FORCE_HYPERLINK;
      } else {
        process.env.FORCE_HYPERLINK = originalEnv;
      }
    }
  });
});

describe('generateCommandHelp epilog', () => {
  it('shows custom epilog in command help', () => {
    const help = stripAnsi(
      generateCommandHelp(
        {
          commands: {
            greet: opt.command({
              description: 'Greet someone',
              handler: () => {},
            }),
          },
          epilog: 'Run with --verbose for more info',
          name: 'my-cli',
        },
        'greet',
        themes.mono,
      ),
    );
    assert.ok(help.includes('Run with --verbose for more info'));
  });

  it('disables epilog in command help when set to false', () => {
    const help = stripAnsi(
      generateCommandHelp(
        {
          commands: {
            greet: opt.command({
              description: 'Greet someone',
              handler: () => {},
            }),
          },
          epilog: false,
          name: 'my-cli',
        },
        'greet',
        themes.mono,
      ),
    );
    assert.ok(!help.includes('Homepage:'));
    assert.ok(!help.includes('Repository:'));
  });
});
