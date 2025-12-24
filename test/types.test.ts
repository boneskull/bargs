import { expect } from 'bupkis';
import { describe, it } from 'node:test';
import { z } from 'zod';

import type { CommandBargsConfig, SimpleBargsConfig } from '../src/types.js';

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
      commands: {
        add: {
          description: 'Add files',
          handler: async () => {},
        },
      },
      globalOptions: z.object({
        verbose: z.boolean().default(false),
      }),
      name: 'mycli',
    };
    expect(config.name, 'to equal', 'mycli');
  });
});
