#!/usr/bin/env npx tsx
/**
 * Transform example (inline version)
 *
 * Same as transforms.ts but with everything inlined to test type inference for
 * inline command definitions.
 *
 * NOTE: Inline command definitions can be fully typed, but you must preserve
 * schema shapes:
 *
 * - Use `bargsAsync.positionals(...)` (not array literals) to get tuple
 *   positionals inference
 * - Use `bargsAsync.options(...)` when composing or reusing option schemas
 *
 * If you want maximum inference with fewer moving parts, prefer
 * `bargsAsync.command<TGlobalOptions, TGlobalTransforms>()()` as shown in
 * transforms.ts.
 *
 * Usage: npx tsx examples/transforms-inline.ts process file1.txt --verbose npx
 * tsx examples/transforms-inline.ts info --config config.json npx tsx
 * examples/transforms-inline.ts --help
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

const main = async () => {
  // Everything is inlined here - no separate variables for options, transforms, or commands
  await bargsAsync({
    commands: {
      // Inline command definition
      info: {
        description: 'Show configuration info',
        handler: ({ values }) => {
          console.log('Current configuration:');
          console.log(`  Config file: ${values.config ?? '(none)'}`);
          console.log(`  Output dir: ${values.outputDir ?? '(default)'}`);
          console.log(`  Verbose: ${values.verbose}`);
          // These come from global transforms
          console.log(`  Config loaded: ${values.configLoaded}`);
          console.log(`  Timestamp: ${values.timestamp}`);
        },
      },
      // Inline command with its own options and transforms
      process: {
        description: 'Process files',
        handler: ({ positionals, values }) => {
          const isStringArray = (value: unknown): value is string[] =>
            Array.isArray(value) && value.every((v) => typeof v === 'string');

          const [maybeFiles] = positionals;
          const files = isStringArray(maybeFiles) ? maybeFiles : [];

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
        positionals: bargsAsync.positionals(
          bargsAsync.variadic('string', {
            description: 'Input files to process',
            name: 'files',
          }),
        ),
        // Inline command-level transform
        transforms: {
          positionals: (positionals: readonly [string[]]) => {
            const [files] = positionals;
            const validFiles = files.filter((f) => {
              if (!existsSync(f)) {
                console.warn(`Warning: File not found: ${f}`);
                return false;
              }
              return true;
            });
            return [validFiles] as const;
          },
        },
      },
    },
    defaultHandler: ({ values }) => {
      console.log('No command specified. Use --help for usage.');
      if (values.verbose) {
        console.log('(verbose mode enabled)');
      }
      // These should be typed from global transforms
      console.log(`Config loaded: ${values.configLoaded}`);
      console.log(`Timestamp: ${values.timestamp}`);
    },
    description: 'Demonstrates inline transforms with commands',
    name: 'transforms-inline-demo',
    // Inline global options
    options: {
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
    },
    // Inline global transforms
    transforms: {
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
    },
    version: '1.0.0',
  });
};

void main();
