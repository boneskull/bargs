#!/usr/bin/env npx tsx
/**
 * Nested commands (subcommands) example
 *
 * A git-like CLI that demonstrates:
 *
 * - Nested command groups (e.g., `git remote add`)
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
// NESTED COMMAND GROUPS
// ═══════════════════════════════════════════════════════════════════════════════

// "remote" command group with subcommands: add, remove, list
const remoteCommands = bargs('remote')
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
      // We can access parent globals (verbose) in nested handlers!
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
        if (values.verbose) {
          console.log(`${name}\t${url}`);
        } else {
          console.log(name);
        }
      }
    },
    'List remotes',
  )
  .defaultCommand('list');

// "config" command group with subcommands: get, set
const configCommands = bargs('config')
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
      if (values.verbose) {
        console.log(`Set ${key} = ${value}`);
      }
    },
    'Set a config value',
  );

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CLI
// ═══════════════════════════════════════════════════════════════════════════════

// Global options that flow down to ALL nested commands
const globals = opt.options({
  verbose: opt.boolean({ aliases: ['v'], default: false }),
});

await bargs('git-like', {
  description: 'A git-like CLI demonstrating nested commands',
  version: '1.0.0',
})
  .globals(globals)
  // Register nested command groups
  .command('remote', remoteCommands, 'Manage remotes')
  .command('config', configCommands, 'Manage configuration')
  // Regular leaf commands work alongside nested ones
  .command(
    'status',
    opt.options({}),
    ({ values }) => {
      console.log('On branch main');
      if (values.verbose) {
        console.log(`Remotes: ${remotes.size}`);
        console.log(`Config entries: ${config.size}`);
      }
    },
    'Show status',
  )
  .defaultCommand('status')
  .parseAsync();
