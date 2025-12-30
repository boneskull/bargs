// test/help.test.ts
import { expect } from 'bupkis';
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

    expect(help, 'to contain', 'my-cli');
    expect(help, 'to contain', 'A test CLI');
  });

  it('includes version when provided', () => {
    const help = stripAnsi(
      generateHelp({
        name: 'my-cli',
        version: '1.0.0',
      }),
    );

    expect(help, 'to contain', '1.0.0');
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

    expect(help, 'to contain', '--verbose');
    expect(help, 'to contain', '-v');
    expect(help, 'to contain', 'Enable verbose output');
    expect(help, 'to contain', '[boolean]');
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

    expect(help, 'to contain', 'low | medium | high');
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

    expect(help, 'to contain', 'default: "world"');
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

    expect(help, 'to contain', '--visible');
    expect(help, 'not to contain', '--secret');
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

    expect(help, 'to contain', 'COMMANDS');
    expect(help, 'to contain', 'run');
    expect(help, 'to contain', 'Run the thing');
    expect(help, 'to contain', 'build');
    expect(help, 'to contain', 'Build the thing');
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

    expect(help, 'to contain', 'LOGGING');
    expect(help, 'to contain', 'NETWORK');
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

    expect(help, 'to contain', '<arg0>');
    expect(help, 'to contain', '[arg1]');
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

    expect(help, 'to contain', '<source>');
    expect(help, 'to contain', '[dest]');
  });

  it('shows variadic positionals with ellipsis', () => {
    const help = stripAnsi(
      generateHelp({
        name: 'my-cli',
        positionals: [opt.variadic('string', { name: 'files' })],
      }),
    );

    expect(help, 'to contain', '[files...]');
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
    expect(help, 'to contain', '<input>');
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

    expect(help, 'to contain', 'my-cli greet');
    expect(help, 'to contain', 'Greet someone');
    expect(help, 'to contain', '--name');
    expect(help, 'to contain', 'GLOBAL OPTIONS');
    expect(help, 'to contain', '--verbose');
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

    expect(help, 'to contain', 'Unknown command: unknown');
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

    expect(help, 'to contain', '<source>');
    expect(help, 'to contain', '<dest>');
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
    expect(help, 'to contain', '\x1b[95m'); // brightMagenta for USAGE
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
    expect(help, 'not to contain', '\x1b[');
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
    expect(help, 'to contain', '\x1b[35m'); // magenta script name
    expect(help, 'to contain', '\x1b[34m'); // blue section header
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
    expect(help, 'to contain', '<arg0>');
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
    expect(help, 'to contain', 'POSITIONALS');
    expect(help, 'to contain', 'Input file');
    expect(help, 'to contain', 'Output file');
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
    expect(help, 'to contain', '\x1b[33m'); // positional color applied
  });
});

describe('generateHelp epilog', () => {
  it('shows custom epilog when provided', () => {
    const config = {
      epilog: 'Thanks for using my CLI!',
      name: 'test-app',
    };
    const help = stripAnsi(generateHelp(config, themes.mono));
    expect(help, 'to contain', 'Thanks for using my CLI!');
  });

  it('disables epilog when set to false', () => {
    const config = {
      epilog: false as const,
      name: 'test-app',
    };
    const help = stripAnsi(generateHelp(config, themes.mono));
    // Should not contain Homepage or Repository (default epilog)
    expect(help, 'not to contain', 'Homepage:');
    expect(help, 'not to contain', 'Repository:');
  });

  it('disables epilog when set to empty string', () => {
    const config = {
      epilog: '',
      name: 'test-app',
    };
    const help = stripAnsi(generateHelp(config, themes.mono));
    // Should not contain Homepage or Repository (default epilog)
    expect(help, 'not to contain', 'Homepage:');
    expect(help, 'not to contain', 'Repository:');
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
    expect(hasEpilog, 'to be truthy');
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
      expect(help, 'to contain', '\x1b]8;;https://example.com');
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
      expect(help, 'to contain', '\x1b]8;;https://docs.example.com');
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
    expect(help, 'to contain', 'Run with --verbose for more info');
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
    expect(help, 'not to contain', 'Homepage:');
    expect(help, 'not to contain', 'Repository:');
  });
});
