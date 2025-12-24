import { expect } from 'bupkis';
import { describe, it } from 'node:test';
import { z } from 'zod';

import { bargs, type CommandBargsConfig } from '../src/index.js';

describe('integration', () => {
  it('should handle a complete CLI workflow', async () => {
    const actions: string[] = [];

    // Using explicit type assertion due to complex Zod v4 transform inference
    await bargs({
      args: ['-v', 'add', '-f', 'file1.txt', 'file2.txt'],
      commands: {
        add: {
          aliases: { force: ['f'] },
          description: 'Add files to staging',
          handler: async (args: {
            force: boolean;
            positionals?: unknown[];
          }) => {
            actions.push(
              `add: force=${args.force}, files=${(args.positionals as string[]).join(',')}`,
            );
          },
          options: z.object({
            force: z
              .boolean()
              .default(false)
              .meta({ description: 'Force add' }),
          }),
          positionals: z.string().array().meta({ description: 'Files to add' }),
        },
        commit: {
          aliases: { message: ['m'] },
          description: 'Commit staged changes',
          handler: async (args: {
            message: string;
            positionals?: unknown[];
          }) => {
            actions.push(`commit: message=${args.message}`);
          },
          options: z.object({
            message: z.string().meta({ description: 'Commit message' }),
          }),
        },
      },
      description: 'A complete test CLI',
      globalAliases: { config: ['c'], verbose: ['v'] },
      globalOptions: z
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
      name: 'mycli',
      version: '1.0.0',
    } as unknown as CommandBargsConfig);

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

    expect(result.count, 'to equal', 5);
    expect(result.doubled, 'to equal', 10);
  });

  it('should apply config file defaults', async () => {
    // Simulate loading from config file
    const configFileDefaults = {
      output: 'from-config.txt',
      verbose: true,
    };

    const result = await bargs({
      args: ['--format', 'yaml'], // Override format from CLI
      defaults: configFileDefaults,
      name: 'withconfig',
      options: z.object({
        format: z.string().default('json'),
        output: z.string().optional(),
        verbose: z.boolean().default(false),
      }),
    });

    expect(result.output, 'to equal', 'from-config.txt'); // From config
    expect(result.verbose, 'to be true'); // From config
    expect(result.format, 'to equal', 'yaml'); // CLI override
  });
});
