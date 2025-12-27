import { expect } from 'bupkis';
import { describe, it } from 'node:test';
import { z } from 'zod';

import { bargs, defineCommand } from '../src/index.js';

describe('integration', () => {
  it('should handle a complete CLI workflow', async () => {
    const actions: string[] = [];

    // Using defineCommand for proper type inference - no type assertions needed!
    await bargs({
      aliases: { config: ['c'], verbose: ['v'] },
      args: ['-v', 'add', '-f', 'file1.txt', 'file2.txt'],
      commands: {
        add: defineCommand({
          aliases: { force: ['f'] },
          description: 'Add files to staging',
          handler: async ({ positionals, values }) => {
            // values.force is correctly inferred as boolean
            // positionals is correctly inferred as string[]
            actions.push(
              `add: force=${values.force}, files=${positionals.join(',')}`,
            );
          },
          options: z.object({
            force: z
              .boolean()
              .default(false)
              .meta({ description: 'Force add' }),
          }),
          positionals: z.string().array().meta({ description: 'Files to add' }),
        }),
        commit: defineCommand({
          aliases: { message: ['m'] },
          description: 'Commit staged changes',
          handler: async ({ values }) => {
            // values.message is correctly inferred as string
            actions.push(`commit: message=${values.message}`);
          },
          options: z.object({
            message: z.string().meta({ description: 'Commit message' }),
          }),
        }),
      },
      description: 'A complete test CLI',
      name: 'mycli',
      options: z
        .object({
          config: z
            .string()
            .optional()
            .meta({ description: 'Config file path' }),
          verbose: z
            .boolean()
            .default(false)
            .meta({ description: 'Enable verbose output' }),
        })
        .transform((args) => {
          if (args.verbose) {
            actions.push('verbose enabled');
          }
          return args;
        }),
      version: '1.0.0',
    });

    expect(actions, 'to contain', 'verbose enabled');
    expect(actions, 'to contain', 'add: force=true, files=file1.txt,file2.txt');
  });

  it('should handle simple CLI with transforms', async () => {
    const result = await bargs({
      args: ['--count', '5'],
      name: 'simple',
      options: z
        .object({
          count: z.coerce.number().default(1),
        })
        .transform(async (args) => ({
          ...args,
          doubled: args.count * 2,
        })),
    });

    expect(result.values.count, 'to equal', 5);
    expect(result.values.doubled, 'to equal', 10);
  });

  it('should apply config file defaults', async () => {
    // Simulate loading from config file
    const configFileDefaults = {
      output: 'from-config.txt',
      verbose: true,
    };

    const result = await bargs({
      args: ['--format', 'yaml'], // Override format from CLI
      config: configFileDefaults,
      name: 'withconfig',
      options: z.object({
        format: z.string().default('json'),
        output: z.string().optional(),
        verbose: z.boolean().default(false),
      }),
    });

    expect(result.values.output, 'to equal', 'from-config.txt'); // From config
    expect(result.values.verbose, 'to be true'); // From config
    expect(result.values.format, 'to equal', 'yaml'); // CLI override
  });
});
