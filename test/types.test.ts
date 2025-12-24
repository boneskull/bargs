import { describe, it } from 'node:test';
import { expect } from 'bupkis';
import { z } from 'zod';
import type { BargsConfig, SimpleBargsConfig, CommandBargsConfig } from '../src/types.js';

describe('types', () => {
  it('should allow a simple config without commands', () => {
    const config: SimpleBargsConfig = {
      name: 'mycli',
      options: z.object({
        verbose: z.boolean().default(false),
      }),
    };
    expect(config.name, 'to equal', 'mycli');
  });

  it('should allow a config with commands', () => {
    const config: CommandBargsConfig = {
      name: 'mycli',
      globalOptions: z.object({
        verbose: z.boolean().default(false),
      }),
      commands: {
        add: {
          description: 'Add files',
          handler: async () => {},
        },
      },
    };
    expect(config.name, 'to equal', 'mycli');
  });
});
