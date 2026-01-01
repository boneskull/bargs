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
import { readFileSync, existsSync } from 'node:fs';

import { bargsAsync } from '../src/index.js';

interface Config {
  verbose?: boolean;
  outputDir?: string;
  maxRetries?: number;
}

const main = async () => {
  const result = await bargsAsync({
    name: 'transforms-demo',
    version: '1.0.0',
    description: 'Demonstrates transforms feature',
    options: {
      config: bargsAsync.string({
        description: 'Path to JSON config file',
        aliases: ['c'],
      }),
      verbose: bargsAsync.boolean({
        description: 'Enable verbose output',
        aliases: ['v'],
        default: false,
      }),
      outputDir: bargsAsync.string({
        description: 'Output directory',
        aliases: ['o'],
      }),
    },
    positionals: [
      bargsAsync.variadic('string', {
        name: 'files',
        description: 'Input files to process',
      }),
    ],
    transforms: {
      // Transform values: load config file and merge with CLI options
      values: (values) => {
        let fileConfig: Config = {};

        // Load config file if specified
        if (values.config && existsSync(values.config)) {
          const content = readFileSync(values.config, 'utf8');
          fileConfig = JSON.parse(content) as Config;
        }

        // CLI options take precedence over file config
        const merged = {
          ...fileConfig,
          ...values,
          // Add computed values
          configLoaded: !!values.config,
          timestamp: new Date().toISOString(),
        };

        return merged;
      },
      // Transform positionals: normalize file paths
      positionals: (positionals) => {
        const [files] = positionals; // Filter out non-existent files and normalize paths
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
    handler: ({ values, positionals }) => {
      const [files] = positionals;

      if (values.verbose) {
        console.log('Configuration:', {
          configLoaded: values.configLoaded,
          timestamp: values.timestamp,
          outputDir: values.outputDir,
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
  });

  // Result contains transformed values
  if (result.values.verbose) {
    console.log('\nFinal result:', result);
  }
};

void main();
