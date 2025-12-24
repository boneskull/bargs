import { expect } from 'bupkis';
import { describe, it } from 'node:test';
import { z } from 'zod';

import { stripAnsi } from '../src/ansi.js';
import { BargsError, formatZodError } from '../src/errors.js';

describe('error formatting', () => {
  describe('formatZodError', () => {
    it('should format a simple type error', () => {
      const schema = z.object({
        count: z.number(),
      });
      const result = schema.safeParse({ count: 'not a number' });
      if (result.success) {
        throw new Error('Expected failure');
      }

      const formatted = formatZodError(result.error);
      const plain = stripAnsi(formatted);

      expect(plain, 'to contain', 'count');
      expect(plain, 'to contain', 'number');
    });

    it('should format multiple errors', () => {
      const schema = z.object({
        age: z.number(),
        name: z.string(),
      });
      const result = schema.safeParse({ age: 'old', name: 123 });
      if (result.success) {
        throw new Error('Expected failure');
      }

      const formatted = formatZodError(result.error);
      const plain = stripAnsi(formatted);

      expect(plain, 'to contain', 'name');
      expect(plain, 'to contain', 'age');
    });

    it('should format nested path errors', () => {
      const schema = z.object({
        config: z.object({
          port: z.number(),
        }),
      });
      const result = schema.safeParse({ config: { port: 'abc' } });
      if (result.success) {
        throw new Error('Expected failure');
      }

      const formatted = formatZodError(result.error);
      const plain = stripAnsi(formatted);

      expect(plain, 'to contain', 'config.port');
    });
  });

  describe('BargsError', () => {
    it('should create an error with name', () => {
      const error = new BargsError('test message');
      expect(error.name, 'to equal', 'BargsError');
      expect(error.message, 'to equal', 'test message');
    });
  });
});
