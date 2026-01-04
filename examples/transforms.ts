#!/usr/bin/env npx tsx
/**
 * Transform example
 *
 * Demonstrates how to use transforms to:
 *
 * - Load and merge config from a JSON file
 * - Add computed/derived values
 * - Transform positionals
 *
 * Usage: npx tsx examples/transforms.ts --verbose npx tsx
 * examples/transforms.ts --config config.json npx tsx examples/transforms.ts
 * file1.txt file2.txt
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
  /* eslint-disable perfectionist/sort-objects -- transforms must come before handler for type inference */
  const result = await bargsAsync({
    description: 'Demonstrates transforms feature',
    name: 'transforms-demo',
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
    positionals: [
      bargsAsync.variadic('string', {
        description: 'Input files to process',
        name: 'files',
      }),
    ],
    transforms: {
      positionals: (positionals) => {
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
      values: (values) => {
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
    handler: ({ positionals, values }) => {
      const [files] = positionals;

      if (values.verbose) {
        console.log('Configuration:', {
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
    version: '1.0.0',
  });
  /* eslint-enable perfectionist/sort-objects */

  if (result.values.verbose) {
    console.log('\nFinal result:', result);
  }
};

void main();
