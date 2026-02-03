/**
 * Tests for shell completion generation.
 */
import { expect } from 'bupkis';
import { describe, it } from 'node:test';

import {
  generateCompletionScript,
  getCompletionCandidates,
  type Shell,
  validateShell,
} from '../src/completion.js';

describe('validateShell()', () => {
  it('accepts "bash"', () => {
    expect(validateShell('bash'), 'to equal', 'bash');
  });

  it('accepts "zsh"', () => {
    expect(validateShell('zsh'), 'to equal', 'zsh');
  });

  it('accepts "fish"', () => {
    expect(validateShell('fish'), 'to equal', 'fish');
  });

  it('throws for unsupported shell', () => {
    expect(
      () => validateShell('powershell'),
      'to throw',
      /Unsupported shell: "powershell"/,
    );
  });

  it('throws with helpful message listing supported shells', () => {
    expect(
      () => validateShell('invalid'),
      'to throw',
      /Supported shells: bash, zsh, fish/,
    );
  });
});

describe('generateCompletionScript()', () => {
  describe('bash', () => {
    it('generates valid bash completion script', () => {
      const script = generateCompletionScript('mytool', 'bash');

      expect(script, 'to contain', '# bash completion for mytool');
      expect(script, 'to contain', '_mytool_completions()');
      expect(
        script,
        'to contain',
        'complete -o default -F _mytool_completions mytool',
      );
      expect(script, 'to contain', '--get-bargs-completions bash');
    });

    it('sanitizes CLI names with dashes', () => {
      const script = generateCompletionScript('my-cool-tool', 'bash');

      expect(script, 'to contain', '_my_cool_tool_completions()');
      expect(
        script,
        'to contain',
        'complete -o default -F _my_cool_tool_completions my-cool-tool',
      );
    });

    it('sanitizes CLI names starting with digits', () => {
      const script = generateCompletionScript('123tool', 'bash');

      // Should prefix with underscore since POSIX identifiers can't start with digit
      expect(script, 'to contain', '__123tool_completions()');
    });

    it('sanitizes CLI names with special characters', () => {
      const script = generateCompletionScript('@scope/my-pkg', 'bash');

      // Should replace @ and / with underscores, collapse consecutive underscores
      expect(script, 'to contain', '_scope_my_pkg_completions()');
    });

    it('includes usage instructions as comments', () => {
      const script = generateCompletionScript('mytool', 'bash');

      expect(script, 'to contain', 'Add to ~/.bashrc');
      expect(script, 'to contain', '--completion-script bash');
    });
  });

  describe('zsh', () => {
    it('generates valid zsh completion script', () => {
      const script = generateCompletionScript('mytool', 'zsh');

      expect(script, 'to contain', '#compdef mytool');
      expect(script, 'to contain', '_mytool()');
      expect(script, 'to contain', 'compdef _mytool mytool');
      expect(script, 'to contain', '--get-bargs-completions zsh');
    });

    it('sanitizes CLI names with dashes', () => {
      const script = generateCompletionScript('my-cool-tool', 'zsh');

      expect(script, 'to contain', '_my_cool_tool()');
      expect(script, 'to contain', 'compdef _my_cool_tool my-cool-tool');
    });

    it('includes usage instructions as comments', () => {
      const script = generateCompletionScript('mytool', 'zsh');

      expect(script, 'to contain', 'Add to ~/.zshrc');
    });
  });

  describe('fish', () => {
    it('generates valid fish completion script', () => {
      const script = generateCompletionScript('mytool', 'fish');

      expect(script, 'to contain', '# fish completion for mytool');
      expect(script, 'to contain', 'function __fish_mytool_complete');
      expect(script, 'to contain', 'complete -c mytool');
      expect(script, 'to contain', '--get-bargs-completions fish');
    });

    it('sanitizes CLI names with dashes', () => {
      const script = generateCompletionScript('my-cool-tool', 'fish');

      expect(script, 'to contain', 'function __fish_my_cool_tool_complete');
      expect(script, 'to contain', 'complete -c my-cool-tool');
    });

    it('includes usage instructions as comments', () => {
      const script = generateCompletionScript('mytool', 'fish');

      expect(script, 'to contain', '~/.config/fish/completions/mytool.fish');
    });
  });

  it('throws for unsupported shell', () => {
    expect(
      () => generateCompletionScript('mytool', 'invalid' as Shell),
      'to throw',
      /Unsupported shell/,
    );
  });
});

describe('getCompletionCandidates()', () => {
  // Helper to create a minimal state that's compatible with getCompletionCandidates
  // We use 'as never' to bypass strict type checking for test purposes since
  // the internal state type isn't exported from completion.ts
  type StateConfig = {
    commands?: Map<
      string,
      {
        aliases?: string[];
        builder?: { __getState: () => ReturnType<typeof createState> };
        cmd?: {
          __optionsSchema: Record<string, unknown>;
          __positionalsSchema: readonly unknown[];
        };
        description?: string;
        type: 'command' | 'nested';
      }
    >;
    globalOptions?: Record<string, unknown>;
    name?: string;
  };

  /**
   * @function
   */
  const createState = (config: StateConfig) =>
    ({
      aliasMap: new Map<string, string>(),
      commands: config.commands ?? new Map(),
      globalParser: config.globalOptions
        ? {
            __optionsSchema: config.globalOptions,
            __positionalsSchema: [] as const,
          }
        : undefined,
      name: config.name ?? 'test-cli',
    }) as Parameters<typeof getCompletionCandidates>[0];

  /**
   * Helper to create a mock nested builder with __getState method.
   *
   * @function
   */
  const createNestedBuilder = (config: StateConfig) => ({
    /**
     * @function
     */
    __getState: () => createState(config),
  });

  describe('command completion', () => {
    it('returns command names when at command position', () => {
      const state = createState({
        commands: new Map([
          [
            'build',
            {
              cmd: { __optionsSchema: {}, __positionalsSchema: [] },
              description: 'Build the project',
              type: 'command',
            },
          ],
          [
            'test',
            {
              cmd: { __optionsSchema: {}, __positionalsSchema: [] },
              description: 'Run tests',
              type: 'command',
            },
          ],
        ]),
      });

      const candidates = getCompletionCandidates(state, 'bash', [
        'test-cli',
        '',
      ]);

      expect(candidates, 'to contain', 'build');
      expect(candidates, 'to contain', 'test');
    });

    it('returns command aliases', () => {
      const state = createState({
        commands: new Map([
          [
            'build',
            {
              aliases: ['b'],
              cmd: { __optionsSchema: {}, __positionalsSchema: [] },
              description: 'Build the project',
              type: 'command',
            },
          ],
        ]),
      });

      const candidates = getCompletionCandidates(state, 'bash', [
        'test-cli',
        '',
      ]);

      expect(candidates, 'to contain', 'build');
      expect(candidates, 'to contain', 'b');
    });

    it('includes descriptions for zsh', () => {
      const state = createState({
        commands: new Map([
          [
            'build',
            {
              cmd: { __optionsSchema: {}, __positionalsSchema: [] },
              description: 'Build the project',
              type: 'command',
            },
          ],
        ]),
      });

      const candidates = getCompletionCandidates(state, 'zsh', [
        'test-cli',
        '',
      ]);

      expect(candidates, 'to contain', 'build:Build the project');
    });

    it('includes descriptions for fish with tab separator', () => {
      const state = createState({
        commands: new Map([
          [
            'build',
            {
              cmd: { __optionsSchema: {}, __positionalsSchema: [] },
              description: 'Build the project',
              type: 'command',
            },
          ],
        ]),
      });

      const candidates = getCompletionCandidates(state, 'fish', [
        'test-cli',
        '',
      ]);

      expect(candidates, 'to contain', 'build\tBuild the project');
    });

    it('excludes __default__ command', () => {
      const state = createState({
        commands: new Map([
          [
            '__default__',
            {
              cmd: { __optionsSchema: {}, __positionalsSchema: [] },
              type: 'command',
            },
          ],
          [
            'build',
            {
              cmd: { __optionsSchema: {}, __positionalsSchema: [] },
              type: 'command',
            },
          ],
        ]),
      });

      const candidates = getCompletionCandidates(state, 'bash', [
        'test-cli',
        '',
      ]);

      expect(candidates, 'not to contain', '__default__');
      expect(candidates, 'to contain', 'build');
    });
  });

  describe('option completion', () => {
    it('returns global options when word starts with -', () => {
      const state = createState({
        globalOptions: {
          output: { description: 'Output file', type: 'string' },
          verbose: { description: 'Verbose output', type: 'boolean' },
        },
      });

      const candidates = getCompletionCandidates(state, 'bash', [
        'test-cli',
        '-',
      ]);

      expect(candidates, 'to contain', '--verbose');
      expect(candidates, 'to contain', '--output');
    });

    it('returns option aliases', () => {
      const state = createState({
        globalOptions: {
          verbose: { aliases: ['v'], type: 'boolean' },
        },
      });

      const candidates = getCompletionCandidates(state, 'bash', [
        'test-cli',
        '-',
      ]);

      expect(candidates, 'to contain', '--verbose');
      expect(candidates, 'to contain', '-v');
    });

    it('returns --no-<name> for boolean options', () => {
      const state = createState({
        globalOptions: {
          verbose: { type: 'boolean' },
        },
      });

      const candidates = getCompletionCandidates(state, 'bash', [
        'test-cli',
        '-',
      ]);

      expect(candidates, 'to contain', '--verbose');
      expect(candidates, 'to contain', '--no-verbose');
    });

    it('excludes hidden options', () => {
      const state = createState({
        globalOptions: {
          hidden: { hidden: true, type: 'boolean' },
          visible: { type: 'boolean' },
        },
      });

      const candidates = getCompletionCandidates(state, 'bash', [
        'test-cli',
        '-',
      ]);

      expect(candidates, 'to contain', '--visible');
      expect(candidates, 'not to contain', '--hidden');
    });

    it('includes command-specific options when in command context', () => {
      const state = createState({
        commands: new Map([
          [
            'build',
            {
              cmd: {
                __optionsSchema: {
                  minify: { type: 'boolean' },
                },
                __positionalsSchema: [],
              },
              type: 'command',
            },
          ],
        ]),
        globalOptions: {
          verbose: { type: 'boolean' },
        },
      });

      const candidates = getCompletionCandidates(state, 'bash', [
        'test-cli',
        'build',
        '-',
      ]);

      expect(candidates, 'to contain', '--verbose'); // global
      expect(candidates, 'to contain', '--minify'); // command-specific
    });
  });

  describe('option value completion', () => {
    it('returns enum choices when completing option value', () => {
      const state = createState({
        globalOptions: {
          level: {
            choices: ['debug', 'info', 'warn', 'error'],
            type: 'enum',
          },
        },
      });

      const candidates = getCompletionCandidates(state, 'bash', [
        'test-cli',
        '--level',
        '',
      ]);

      expect(candidates, 'to contain', 'debug');
      expect(candidates, 'to contain', 'info');
      expect(candidates, 'to contain', 'warn');
      expect(candidates, 'to contain', 'error');
    });

    it('returns no candidates for non-enum options (allows file completion)', () => {
      const state = createState({
        globalOptions: {
          output: { type: 'string' },
        },
      });

      const candidates = getCompletionCandidates(state, 'bash', [
        'test-cli',
        '--output',
        '',
      ]);

      expect(candidates, 'to be empty');
    });
  });

  describe('positional completion', () => {
    it('returns enum choices for enum positionals', () => {
      const state = createState({
        commands: new Map([
          [
            'build',
            {
              cmd: {
                __optionsSchema: {},
                __positionalsSchema: [
                  {
                    choices: ['dev', 'prod', 'staging'],
                    name: 'target',
                    type: 'enum',
                  },
                ],
              },
              type: 'command',
            },
          ],
        ]),
      });

      const candidates = getCompletionCandidates(state, 'bash', [
        'test-cli',
        'build',
        '',
      ]);

      expect(candidates, 'to contain', 'dev');
      expect(candidates, 'to contain', 'prod');
      expect(candidates, 'to contain', 'staging');
    });
  });

  describe('edge cases', () => {
    it('handles empty words array', () => {
      const state = createState({});

      const candidates = getCompletionCandidates(state, 'bash', []);

      // Should return options or empty, not throw
      expect(candidates, 'to be an', 'array');
    });

    it('handles CLI with no commands or options', () => {
      const state = createState({});

      const candidates = getCompletionCandidates(state, 'bash', [
        'test-cli',
        '',
      ]);

      expect(candidates, 'to be an', 'array');
    });
  });

  describe('nested command completion', () => {
    it('returns subcommands when inside a nested command', () => {
      // Create nested builder for 'remote' command with 'add' and 'remove' subcommands
      const remoteBuilder = createNestedBuilder({
        commands: new Map([
          [
            'add',
            {
              cmd: { __optionsSchema: {}, __positionalsSchema: [] },
              description: 'Add a remote',
              type: 'command',
            },
          ],
          [
            'remove',
            {
              aliases: ['rm'],
              cmd: { __optionsSchema: {}, __positionalsSchema: [] },
              description: 'Remove a remote',
              type: 'command',
            },
          ],
        ]),
        name: 'remote',
      });

      const state = createState({
        commands: new Map([
          [
            'remote',
            {
              aliases: ['r'],
              builder: remoteBuilder,
              description: 'Manage remotes',
              type: 'nested',
            },
          ],
        ]),
      });

      // Complete after 'git remote '
      const candidates = getCompletionCandidates(state, 'bash', [
        'git',
        'remote',
        '',
      ]);

      expect(candidates, 'to contain', 'add');
      expect(candidates, 'to contain', 'remove');
      expect(candidates, 'to contain', 'rm'); // alias
    });

    it('returns subcommands when using parent alias', () => {
      const remoteBuilder = createNestedBuilder({
        commands: new Map([
          [
            'add',
            {
              cmd: { __optionsSchema: {}, __positionalsSchema: [] },
              type: 'command',
            },
          ],
        ]),
        name: 'remote',
      });

      const state = createState({
        commands: new Map([
          [
            'remote',
            {
              aliases: ['r'],
              builder: remoteBuilder,
              type: 'nested',
            },
          ],
        ]),
      });

      // Complete after 'git r ' (using alias)
      const candidates = getCompletionCandidates(state, 'bash', [
        'git',
        'r',
        '',
      ]);

      expect(candidates, 'to contain', 'add');
    });

    it('returns options from leaf command inside nested command', () => {
      const remoteBuilder = createNestedBuilder({
        commands: new Map([
          [
            'add',
            {
              cmd: {
                __optionsSchema: {
                  force: { aliases: ['f'], type: 'boolean' },
                },
                __positionalsSchema: [],
              },
              type: 'command',
            },
          ],
        ]),
        name: 'remote',
      });

      const state = createState({
        commands: new Map([
          [
            'remote',
            {
              builder: remoteBuilder,
              type: 'nested',
            },
          ],
        ]),
      });

      // Complete after 'git remote add -'
      const candidates = getCompletionCandidates(state, 'bash', [
        'git',
        'remote',
        'add',
        '-',
      ]);

      expect(candidates, 'to contain', '--force');
      expect(candidates, 'to contain', '-f');
    });

    it('accumulates global options from parent levels', () => {
      const remoteBuilder = createNestedBuilder({
        commands: new Map([
          [
            'add',
            {
              cmd: {
                __optionsSchema: {
                  force: { type: 'boolean' },
                },
                __positionalsSchema: [],
              },
              type: 'command',
            },
          ],
        ]),
        globalOptions: {
          // Nested level global option (use kebab-case directly)
          'dry-run': { aliases: ['n'], type: 'boolean' },
        },
        name: 'remote',
      });

      const state = createState({
        commands: new Map([
          [
            'remote',
            {
              builder: remoteBuilder,
              type: 'nested',
            },
          ],
        ]),
        // Top-level global option
        globalOptions: {
          verbose: { aliases: ['v'], type: 'boolean' },
        },
      });

      // Complete after 'git remote add -'
      const candidates = getCompletionCandidates(state, 'bash', [
        'git',
        'remote',
        'add',
        '-',
      ]);

      // Should have options from all levels
      expect(candidates, 'to contain', '--verbose'); // top-level global
      expect(candidates, 'to contain', '-v');
      expect(candidates, 'to contain', '--dry-run'); // nested global
      expect(candidates, 'to contain', '-n');
      expect(candidates, 'to contain', '--force'); // command-specific
    });

    it('handles deeply nested commands (3+ levels)', () => {
      // git -> stash -> push -> save
      const pushBuilder = createNestedBuilder({
        commands: new Map([
          [
            'save',
            {
              cmd: { __optionsSchema: {}, __positionalsSchema: [] },
              description: 'Save stash',
              type: 'command',
            },
          ],
        ]),
        name: 'push',
      });

      const stashBuilder = createNestedBuilder({
        commands: new Map([
          [
            'pop',
            {
              cmd: { __optionsSchema: {}, __positionalsSchema: [] },
              description: 'Pop from stash',
              type: 'command',
            },
          ],
          [
            'push',
            {
              builder: pushBuilder,
              description: 'Push to stash',
              type: 'nested',
            },
          ],
        ]),
        name: 'stash',
      });

      const state = createState({
        commands: new Map([
          [
            'stash',
            {
              builder: stashBuilder,
              description: 'Stash changes',
              type: 'nested',
            },
          ],
        ]),
      });

      // Complete at first nested level: 'git stash '
      let candidates = getCompletionCandidates(state, 'bash', [
        'git',
        'stash',
        '',
      ]);
      expect(candidates, 'to contain', 'push');
      expect(candidates, 'to contain', 'pop');

      // Complete at second nested level: 'git stash push '
      candidates = getCompletionCandidates(state, 'bash', [
        'git',
        'stash',
        'push',
        '',
      ]);
      expect(candidates, 'to contain', 'save');
    });

    it('returns positional choices for nested leaf command', () => {
      const remoteBuilder = createNestedBuilder({
        commands: new Map([
          [
            'add',
            {
              cmd: {
                __optionsSchema: {},
                __positionalsSchema: [
                  {
                    choices: ['origin', 'upstream', 'fork'],
                    name: 'name',
                    type: 'enum',
                  },
                ],
              },
              type: 'command',
            },
          ],
        ]),
        name: 'remote',
      });

      const state = createState({
        commands: new Map([
          [
            'remote',
            {
              builder: remoteBuilder,
              type: 'nested',
            },
          ],
        ]),
      });

      // Complete positional after 'git remote add '
      const candidates = getCompletionCandidates(state, 'bash', [
        'git',
        'remote',
        'add',
        '',
      ]);

      expect(candidates, 'to contain', 'origin');
      expect(candidates, 'to contain', 'upstream');
      expect(candidates, 'to contain', 'fork');
    });
  });
});
