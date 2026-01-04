#!/usr/bin/env npx tsx
/**
 * Transform example
 *
 * Demonstrates how to use transforms with both simple CLIs and commands:
 *
 * - Global transforms that apply to all commands
 * - Command-specific transforms
 * - Computed/derived values flowing through handlers
 *
 * Usage: npx tsx examples/transforms.ts process file1.txt file2.txt --verbose
 * npx tsx examples/transforms.ts info --config config.json npx tsx
 * examples/transforms.ts --help
 */
import { existsSync, readFileSync } from 'node:fs';

import { bargsAsync } from '../src/index.js';

/**
 * Config that can be loaded from a JSON file.
 */
interface Config {
  maxRetries?: number;
  outputDir?: string;
  verbose?: boolean;
}

// Global options that will be available to all commands
const globalOptions = {
  config: bargsAsync.string({
    aliases: ['c'],
    description: 'Path to JSON config file',
  }),
  outputDir: bargsAsync.string({
    aliases: ['o'],
    description: 'Output directory',
  }),
  verbose: bargsAsync.boolean({
    aliases: ['v'],
    default: false,
    description: 'Enable verbose output',
  }),
} as const;

// Global transforms - these run before command transforms
const globalTransforms = {
  values: (values: {
    config: string | undefined;
    outputDir: string | undefined;
    verbose: boolean;
  }) => {
    let fileConfig: Config = {};

    if (values.config && existsSync(values.config)) {
      const content = readFileSync(values.config, 'utf8');
      fileConfig = JSON.parse(content) as Config;
    }

    return {
      ...fileConfig,
      ...values,
      configLoaded: !!values.config,
      timestamp: new Date().toISOString(),
    };
  },
} as const;

// Define commands using the typed command builder with global transforms
// The second type argument passes global transforms for proper type inference
const processCommand = bargsAsync.command<
  typeof globalOptions,
  typeof globalTransforms
>()({
  description: 'Process files',
  handler: ({ positionals, values }) => {
    // Global transform properties are now available via TGlobalTransforms type arg
    const [files] = positionals;

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
      console.log(`  - ${file.toUpperCase()}`); // Command transform uppercases
    }

    if (values.outputDir) {
      console.log(`Output will be written to: ${values.outputDir}`);
    }
  },
  positionals: [
    bargsAsync.variadic('string', {
      description: 'Input files to process',
      name: 'files',
    }),
  ],
  // Command-level transform - processes positionals
  transforms: {
    positionals: (positionals) => {
      const [files] = positionals;
      // Filter non-existent files and uppercase the rest
      const validFiles = files
        .filter((f) => {
          if (!existsSync(f)) {
            console.warn(`Warning: File not found: ${f}`);
            return false;
          }
          return true;
        })
        .map((f) => f.toUpperCase());
      return [validFiles] as const;
    },
  },
});

const infoCommand = bargsAsync.command<
  typeof globalOptions,
  typeof globalTransforms
>()({
  description: 'Show configuration info',
  handler: ({ values }) => {
    // Global transform properties are available via TGlobalTransforms type arg
    console.log('Current configuration:');
    console.log(`  Config file: ${values.config ?? '(none)'}`);
    console.log(`  Output dir: ${values.outputDir ?? '(default)'}`);
    console.log(`  Verbose: ${values.verbose}`);
    console.log(`  Config loaded: ${values.configLoaded}`);
    console.log(`  Timestamp: ${values.timestamp}`);
  },
});

const main = async () => {
  await bargsAsync({
    commands: {
      info: infoCommand,
      process: processCommand,
    },
    defaultHandler: ({ values }) => {
      console.log('No command specified. Use --help for usage.');
      if (values.verbose) {
        console.log('(verbose mode enabled)');
      }
      // Test: Can we access global transform-added properties?
      console.log(`Config loaded: ${values.configLoaded}`);
      console.log(`Timestamp: ${values.timestamp}`);
    },
    description: 'Demonstrates transforms with commands',
    name: 'transforms-demo',
    options: globalOptions,
    transforms: globalTransforms,
    version: '1.0.0',
  });
};

void main();
