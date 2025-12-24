import { expect } from 'bupkis';
import { describe, it } from 'node:test';
import { z } from 'zod';

import { stripAnsi } from '../src/ansi.js';
import { formatOptionHelp, generateHelp } from '../src/help.js';

describe('help generation', () => {
  describe('formatOptionHelp', () => {
    it('should format a simple boolean option', () => {
      const result = formatOptionHelp('verbose', z.boolean(), {
        verbose: ['v'],
      });
      const plain = stripAnsi(result);
      expect(plain, 'to contain', '-v, --verbose');
      expect(plain, 'to contain', '[boolean]');
    });

    it('should format a string option with description', () => {
      const schema = z.string().meta({ description: 'Output file path' });
      const result = formatOptionHelp('output', schema, { output: ['o'] });
      const plain = stripAnsi(result);
      expect(plain, 'to contain', '-o, --output');
      expect(plain, 'to contain', 'Output file path');
      expect(plain, 'to contain', '[string]');
    });

    it('should show default value', () => {
      const schema = z.boolean().default(false);
      const result = formatOptionHelp('verbose', schema, {});
      const plain = stripAnsi(result);
      expect(plain, 'to contain', 'default: false');
    });
  });

  describe('generateHelp', () => {
    it('should generate help for simple CLI', () => {
      const config = {
        aliases: { output: ['o'], verbose: ['v'] },
        description: 'A test CLI',
        name: 'mycli',
        options: z.object({
          output: z.string().optional().meta({ description: 'Output file' }),
          verbose: z
            .boolean()
            .default(false)
            .meta({ description: 'Enable verbose output' }),
        }),
        version: '1.0.0',
      };
      const help = generateHelp(config);
      const plain = stripAnsi(help);

      expect(plain, 'to contain', 'mycli');
      expect(plain, 'to contain', '1.0.0');
      expect(plain, 'to contain', 'A test CLI');
      expect(plain, 'to contain', '-v, --verbose');
      expect(plain, 'to contain', '-o, --output');
    });

    it('should generate help for CLI with commands', () => {
      const config = {
        commands: {
          add: { description: 'Add files', handler: async () => {} },
          commit: { description: 'Commit changes', handler: async () => {} },
        },
        description: 'A test CLI',
        globalOptions: z.object({
          verbose: z.boolean().default(false),
        }),
        name: 'mycli',
      };
      const help = generateHelp(config);
      const plain = stripAnsi(help);

      expect(plain, 'to contain', 'COMMANDS');
      expect(plain, 'to contain', 'add');
      expect(plain, 'to contain', 'Add files');
      expect(plain, 'to contain', 'commit');
      expect(plain, 'to contain', 'Commit changes');
    });

    it('should group options by group metadata', () => {
      const config = {
        name: 'mycli',
        options: z.object({
          input: z.string().meta({ description: 'Input file', group: 'Input' }),
          quiet: z.boolean().meta({ description: 'Quiet', group: 'Output' }),
          verbose: z
            .boolean()
            .meta({ description: 'Verbose', group: 'Output' }),
        }),
      };
      const help = generateHelp(config);
      const plain = stripAnsi(help);

      expect(plain, 'to contain', 'OUTPUT');
      expect(plain, 'to contain', 'INPUT');
    });
  });
});
