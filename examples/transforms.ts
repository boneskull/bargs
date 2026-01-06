#!/usr/bin/env npx tsx
/**
 * Transform example
 *
 * Demonstrates how to use map() transforms:
 *
 * - Global transforms via map() applied to globals parser
 * - Using camelCaseValues to convert kebab-case to camelCase
 * - Command-specific transforms via map() in command parsers
 * - Computed/derived values flowing through handlers
 * - Full type inference with the (Parser, handler) API
 *
 * Usage: npx tsx examples/transforms.ts process file1.txt file2.txt --verbose
 * npx tsx examples/transforms.ts info --config config.json npx tsx
 * examples/transforms.ts --help
 */
import { existsSync, readFileSync } from 'node:fs';

import { bargs, camelCaseValues, map, opt, pos } from '../src/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG TYPE
// ═══════════════════════════════════════════════════════════════════════════════

interface Config {
  maxRetries?: number;
  outputDir?: string;
  verbose?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GLOBAL OPTIONS WITH TRANSFORM
// ═══════════════════════════════════════════════════════════════════════════════

// Global options using kebab-case (CLI-friendly)
const baseGlobals = opt.options({
  config: opt.string(),
  'output-dir': opt.string(), // CLI: --output-dir
  verbose: opt.boolean({ default: false }),
});

// First, convert kebab-case to camelCase for ergonomic property access
const camelGlobals = map(baseGlobals, camelCaseValues);

// Then apply additional transforms for computed properties
const globals = map(camelGlobals, ({ positionals, values }) => {
  let fileConfig: Config = {};

  // Load config from JSON file if specified
  if (values.config && existsSync(values.config)) {
    const content = readFileSync(values.config, 'utf8');
    fileConfig = JSON.parse(content) as Config;
  }

  // Return enriched values with file config merged in
  // Note: values.outputDir is now camelCase thanks to camelCaseValues!
  return {
    positionals,
    values: {
      ...fileConfig,
      ...values,
      configLoaded: !!values.config,
      timestamp: new Date().toISOString(),
    },
  };
});

// ═══════════════════════════════════════════════════════════════════════════════
// COMMAND PARSERS
// ═══════════════════════════════════════════════════════════════════════════════

// Process command: variadic positional with transform
const processBase = pos.positionals(pos.variadic('string', { name: 'files' }));
const processParser = map(processBase, ({ positionals, values }) => {
  const [files] = positionals;
  const validFiles = (files ?? [])
    .filter((f) => {
      if (!existsSync(f)) {
        console.warn(`Warning: File not found: ${f}`);
        return false;
      }
      return true;
    })
    .map((f) => f.toUpperCase());

  return {
    positionals: [validFiles] as const,
    values,
  };
});

// Info command: no command-specific options
const infoParser = opt.options({});

// ═══════════════════════════════════════════════════════════════════════════════
// CLI
// Using (Parser, handler, description) form for full type inference!
// ═══════════════════════════════════════════════════════════════════════════════

await bargs('transforms-demo', {
  description: 'Demonstrates transforms with commands',
  version: '1.0.0',
})
  .globals(globals)
  // The handler receives merged global + command types
  .command(
    'process',
    processParser,
    ({ positionals, values }) => {
      const [files] = positionals;
      // values has full type from globals transform:
      // { config, outputDir, verbose, configLoaded, timestamp, maxRetries }

      if (values.verbose) {
        console.log('Processing configuration:', {
          configLoaded: values.configLoaded,
          outputDir: values.outputDir,
          timestamp: values.timestamp,
          verbose: values.verbose,
        });
      }

      console.log(`Processing ${files.length} file(s):`);
      for (const file of files) {
        console.log(`  - ${file}`);
      }

      if (values.outputDir) {
        console.log(`Output will be written to: ${values.outputDir}`);
      }
    },
    'Process files',
  )
  .command(
    'info',
    infoParser,
    ({ values }) => {
      // values has full type from globals transform
      if (values.verbose) {
        console.log('Verbose mode enabled');
      }
      console.log('Current configuration:');
      console.log(`  Config file: ${values.config ?? '(none)'}`);
      console.log(`  Output dir: ${values.outputDir ?? '(default)'}`);
      console.log(`  Verbose: ${values.verbose}`);
      console.log(`  Config loaded: ${values.configLoaded}`);
      console.log(`  Timestamp: ${values.timestamp}`);
    },
    'Show configuration info',
  )
  .defaultCommand('info')
  .parseAsync();
