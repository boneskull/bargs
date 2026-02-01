#!/usr/bin/env npx tsx
/**
 * Shell completion example
 *
 * Demonstrates how to enable shell completion for a CLI.
 *
 * To enable completions for this example:
 *
 * # Bash (add to ~/.bashrc)
 *
 * Npx tsx examples/completion.ts --completion-script bash >> ~/.bashrc source
 * ~/.bashrc
 *
 * # Zsh (add to ~/.zshrc)
 *
 * Npx tsx examples/completion.ts --completion-script zsh >> ~/.zshrc source
 * ~/.zshrc
 *
 * # Fish (save to completions directory)
 *
 * Npx tsx examples/completion.ts --completion-script fish >
 * ~/.config/fish/completions/completion-demo.fish
 *
 * Then try pressing TAB after typing partial commands or options.
 *
 * Usage: npx tsx examples/completion.ts build --target prod npx tsx
 * examples/completion.ts test --coverage npx tsx examples/completion.ts lint
 * --fix
 */
import { bargs, opt, pos } from '../src/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// GLOBAL OPTIONS
// ═══════════════════════════════════════════════════════════════════════════════

const globalOptions = opt.options({
  config: opt.string({
    aliases: ['c'],
    description: 'Path to config file',
  }),
  verbose: opt.boolean({
    aliases: ['v'],
    default: false,
    description: 'Enable verbose output',
  }),
});

// ═══════════════════════════════════════════════════════════════════════════════
// BUILD COMMAND
// ═══════════════════════════════════════════════════════════════════════════════

const buildParser = opt.options({
  minify: opt.boolean({
    aliases: ['m'],
    default: false,
    description: 'Minify output',
  }),
  // Enum option - completions will suggest these choices
  target: opt.enum(['dev', 'staging', 'prod'], {
    aliases: ['t'],
    default: 'dev',
    description: 'Build target environment',
  }),
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST COMMAND
// ═══════════════════════════════════════════════════════════════════════════════

const testParser = pos.positionals(
  // Enum positional - completions will suggest these choices
  pos.enum(['unit', 'integration', 'e2e'], {
    description: 'Test type to run',
    name: 'type',
  }),
)(
  opt.options({
    coverage: opt.boolean({
      default: false,
      description: 'Collect coverage',
    }),
    watch: opt.boolean({
      aliases: ['w'],
      default: false,
      description: 'Watch for changes',
    }),
  }),
);

// ═══════════════════════════════════════════════════════════════════════════════
// LINT COMMAND
// ═══════════════════════════════════════════════════════════════════════════════

const lintParser = opt.options({
  fix: opt.boolean({
    default: false,
    description: 'Auto-fix issues',
  }),
  // Enum option - completions will suggest these choices
  format: opt.enum(['stylish', 'json', 'compact'], {
    default: 'stylish',
    description: 'Output format',
  }),
});

// ═══════════════════════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════════════════════

await bargs('completion-demo', {
  // Enable shell completion support!
  completion: true,
  description: 'Example CLI with shell completion support',
  version: '1.0.0',
})
  .globals(globalOptions)
  .command(
    'build',
    buildParser,
    ({ values }) => {
      console.log('Building for:', values.target);
      console.log('Minify:', values.minify);
      if (values.verbose) {
        console.log('Config:', values.config ?? '(default)');
      }
    },
    { aliases: ['b'], description: 'Build the project' },
  )
  .command(
    'test',
    testParser,
    ({ positionals, values }) => {
      console.log('Running tests:', positionals[0] ?? 'all');
      console.log('Coverage:', values.coverage);
      console.log('Watch:', values.watch);
      if (values.verbose) {
        console.log('Config:', values.config ?? '(default)');
      }
    },
    { aliases: ['t'], description: 'Run tests' },
  )
  .command(
    'lint',
    lintParser,
    ({ values }) => {
      console.log('Linting with format:', values.format);
      console.log('Fix:', values.fix);
      if (values.verbose) {
        console.log('Config:', values.config ?? '(default)');
      }
    },
    { aliases: ['l'], description: 'Lint source files' },
  )
  .parseAsync();
