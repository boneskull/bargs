import { expect } from 'bupkis';
import { describe, it } from 'node:test';
import { z } from 'zod';

import type { BargsConfig, BargsConfigWithCommands } from '../src/types.js';

describe('types', () => {
  it('should allow a simple config without commands', () => {
    const config: BargsConfig = {
      name: 'mycli',
      options: z.object({
        verbose: z.boolean().default(false),
      }),
    };
    expect(config.name, 'to equal', 'mycli');
  });

  it('should allow a config with commands', () => {
    const config: BargsConfigWithCommands = {
      commands: {
        add: {
          description: 'Add files',
          handler: async () => {},
        },
      },
      name: 'mycli',
      options: z.object({
        verbose: z.boolean().default(false),
      }),
    };
    expect(config.name, 'to equal', 'mycli');
  });
});
