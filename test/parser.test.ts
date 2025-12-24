import { expect } from 'bupkis';
import { describe, it } from 'node:test';
import { z } from 'zod';

import { parseSimple } from '../src/parser.js';

describe('parser', () => {
  describe('parseSimple', () => {
    it('should parse boolean flags', async () => {
      const schema = z.object({
        verbose: z.boolean().default(false),
      });
      const result = await parseSimple({
        args: ['--verbose'],
        options: schema,
      });
      expect(result.verbose, 'to be true');
    });

    it('should parse string options', async () => {
      const schema = z.object({
        output: z.string(),
      });
      const result = await parseSimple({
        args: ['--output', 'file.txt'],
        options: schema,
      });
      expect(result.output, 'to equal', 'file.txt');
    });

    it('should parse array options', async () => {
      const schema = z.object({
        files: z.string().array(),
      });
      const result = await parseSimple({
        args: ['--files', 'a.txt', '--files', 'b.txt'],
        options: schema,
      });
      expect(result.files, 'to satisfy', ['a.txt', 'b.txt']);
    });

    it('should apply aliases', async () => {
      const schema = z.object({
        verbose: z.boolean().default(false),
      });
      const result = await parseSimple({
        aliases: { verbose: ['v'] },
        args: ['-v'],
        options: schema,
      });
      expect(result.verbose, 'to be true');
    });

    it('should apply defaults', async () => {
      const schema = z.object({
        count: z.number().default(10),
      });
      const result = await parseSimple({
        args: [],
        options: schema,
      });
      expect(result.count, 'to equal', 10);
    });

    it('should merge user-provided defaults', async () => {
      const schema = z.object({
        output: z.string().optional(),
      });
      const result = await parseSimple({
        args: [],
        defaults: { output: 'default.txt' },
        options: schema,
      });
      expect(result.output, 'to equal', 'default.txt');
    });

    it('should let CLI args override defaults', async () => {
      const schema = z.object({
        output: z.string().optional(),
      });
      const result = await parseSimple({
        args: ['--output', 'override.txt'],
        defaults: { output: 'default.txt' },
        options: schema,
      });
      expect(result.output, 'to equal', 'override.txt');
    });

    it('should parse positionals', async () => {
      const schema = z.object({});
      const positionals = z.tuple([z.string(), z.string()]);
      const result = await parseSimple({
        args: ['arg1', 'arg2'],
        options: schema,
        positionals,
      });
      expect(result.positionals, 'to satisfy', ['arg1', 'arg2']);
    });

    it('should run transforms (middleware)', async () => {
      const schema = z
        .object({
          multiplier: z.coerce.number().default(1),
        })
        .transform((args) => ({
          ...args,
          computed: args.multiplier * 10,
        }));
      const result = await parseSimple({
        args: ['--multiplier', '5'],
        options: schema,
      });
      expect(result.computed, 'to equal', 50);
    });

    it('should throw on unknown options (strict mode)', async () => {
      const schema = z.object({
        verbose: z.boolean().default(false),
      });
      try {
        await parseSimple({
          args: ['--unknown'],
          options: schema,
        });
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as Error).message, 'to contain', 'unknown');
      }
    });
  });
});
