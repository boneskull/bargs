#!/usr/bin/env npx tsx
/**
 * Nested commands (subcommands) example
 *
 * A git-like CLI that demonstrates:
 *
 * - Nested command groups (e.g., `git remote add`)
 * - Factory pattern for full type inference of parent globals
 * - Unlimited nesting depth
 * - Parent globals flowing to nested handlers
 * - Default subcommands
 *
 * Usage: npx tsx examples/nested-commands.ts remote add origin
 * https://github.com/... npx tsx examples/nested-commands.ts remote remove
 * origin npx tsx examples/nested-commands.ts config get user.name npx tsx
 * examples/nested-commands.ts --verbose remote add origin https://... npx tsx
 * examples/nested-commands.ts --help npx tsx examples/nested-commands.ts remote
 * --help
 */
import { bargs, opt, pos } from '../src/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// DATA STORE
// ═══════════════════════════════════════════════════════════════════════════════

const remotes: Map<string, string> = new Map([
  ['origin', 'https://example.com'],
]);
const config: Map<string, string> = new Map([
  ['user.email', 'anon@example.com'],
  ['user.name', 'Anonymous'],
]);

// ═══════════════════════════════════════════════════════════════════════════════
// GLOBAL OPTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// Global options that flow down to ALL nested commands
const globals = opt.options({
  verbose: opt.boolean({ aliases: ['v'], default: false }),
});

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CLI
// ═══════════════════════════════════════════════════════════════════════════════

await bargs('git-like', {
  description: 'A git-like CLI demonstrating nested commands',
  version: '1.0.0',
})
  .globals(globals)

  // ─────────────────────────────────────────────────────────────────────────────
  // FACTORY PATTERN: Full type inference for parent globals!
  // The factory receives a builder that already has parent globals typed.
  // ─────────────────────────────────────────────────────────────────────────────
  .command(
    'remote',
    (remote) =>
      remote
        .command(
          'add',
          pos.positionals(
            pos.string({ name: 'name', required: true }),
            pos.string({ name: 'url', required: true }),
          ),
          ({ positionals, values }) => {
            const [name, url] = positionals;
            if (remotes.has(name)) {
              console.error(`Remote '${name}' already exists`);
              process.exit(1);
            }
            remotes.set(name, url);
            // values.verbose is fully typed! (from parent globals)
            if (values.verbose) {
              console.log(`Added remote '${name}' with URL: ${url}`);
            } else {
              console.log(`Added remote '${name}'`);
            }
          },
          'Add a remote',
        )
        .command(
          'remove',
          pos.positionals(pos.string({ name: 'name', required: true })),
          ({ positionals, values }) => {
            const [name] = positionals;
            if (!remotes.has(name)) {
              console.error(`Remote '${name}' not found`);
              process.exit(1);
            }
            remotes.delete(name);
            // values.verbose is typed!
            if (values.verbose) {
              console.log(`Removed remote '${name}'`);
            }
          },
          'Remove a remote',
        )
        .command(
          'list',
          opt.options({}),
          ({ values }) => {
            if (remotes.size === 0) {
              console.log('No remotes configured');
              return;
            }
            for (const [name, url] of remotes) {
              // values.verbose is typed!
              if (values.verbose) {
                console.log(`${name}\t${url}`);
              } else {
                console.log(name);
              }
            }
          },
          'List remotes',
        )
        .defaultCommand('list'),
    'Manage remotes',
  )

  // ─────────────────────────────────────────────────────────────────────────────
  // Another nested command group using the factory pattern
  // ─────────────────────────────────────────────────────────────────────────────
  .command(
    'config',
    (cfg) =>
      cfg
        .command(
          'get',
          pos.positionals(pos.string({ name: 'key', required: true })),
          ({ positionals }) => {
            const [key] = positionals;
            const value = config.get(key);
            if (value === undefined) {
              console.error(`Config key '${key}' not found`);
              process.exit(1);
            }
            console.log(value);
          },
          'Get a config value',
        )
        .command(
          'set',
          pos.positionals(
            pos.string({ name: 'key', required: true }),
            pos.string({ name: 'value', required: true }),
          ),
          ({ positionals, values }) => {
            const [key, value] = positionals;
            config.set(key, value);
            // values.verbose is typed!
            if (values.verbose) {
              console.log(`Set ${key} = ${value}`);
            }
          },
          'Set a config value',
        ),
    'Manage configuration',
  )

  // ─────────────────────────────────────────────────────────────────────────────
  // Regular leaf commands work alongside nested ones
  // ─────────────────────────────────────────────────────────────────────────────
  .command(
    'status',
    opt.options({}),
    ({ values }) => {
      console.log('On branch main');
      // values.verbose is typed for leaf commands too!
      if (values.verbose) {
        console.log(`Remotes: ${remotes.size}`);
        console.log(`Config entries: ${config.size}`);
      }
    },
    'Show status',
  )
  .defaultCommand('status')
  .parseAsync();
