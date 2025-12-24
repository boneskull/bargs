import { describe, it } from 'node:test';
import { expect } from 'bupkis';
import { z } from 'zod';
import { extractParseArgsConfig, getSchemaMetadata } from '../src/schema.js';

describe('schema introspection', () => {
  describe('extractParseArgsConfig', () => {
    it('should extract boolean option', () => {
      const schema = z.object({
        verbose: z.boolean(),
      });
      const config = extractParseArgsConfig(schema, {});
      expect(config, 'to satisfy', {
        verbose: { type: 'boolean' },
      });
    });

    it('should extract string option', () => {
      const schema = z.object({
        output: z.string(),
      });
      const config = extractParseArgsConfig(schema, {});
      expect(config, 'to satisfy', {
        output: { type: 'string' },
      });
    });

    it('should extract array option as multiple', () => {
      const schema = z.object({
        files: z.string().array(),
      });
      const config = extractParseArgsConfig(schema, {});
      expect(config, 'to satisfy', {
        files: { type: 'string', multiple: true },
      });
    });

    it('should handle optional types', () => {
      const schema = z.object({
        output: z.string().optional(),
      });
      const config = extractParseArgsConfig(schema, {});
      expect(config, 'to satisfy', {
        output: { type: 'string' },
      });
    });

    it('should handle default types', () => {
      const schema = z.object({
        verbose: z.boolean().default(false),
      });
      const config = extractParseArgsConfig(schema, {});
      expect(config, 'to satisfy', {
        verbose: { type: 'boolean', default: false },
      });
    });

    it('should apply aliases', () => {
      const schema = z.object({
        verbose: z.boolean(),
      });
      const config = extractParseArgsConfig(schema, { verbose: ['v'] });
      expect(config, 'to satisfy', {
        verbose: { type: 'boolean', short: 'v' },
      });
    });

    it('should use first single-char alias as short', () => {
      const schema = z.object({
        config: z.string(),
      });
      const config = extractParseArgsConfig(schema, { config: ['config-file', 'c'] });
      expect(config, 'to satisfy', {
        config: { type: 'string', short: 'c' },
      });
    });
  });

  describe('getSchemaMetadata', () => {
    it('should extract description from meta', () => {
      const schema = z.string().meta({ description: 'A test description' });
      const meta = getSchemaMetadata(schema);
      expect(meta.description, 'to equal', 'A test description');
    });

    it('should extract group from meta', () => {
      const schema = z.string().meta({ group: 'Output Options' });
      const meta = getSchemaMetadata(schema);
      expect(meta.group, 'to equal', 'Output Options');
    });

    it('should return empty object for schema without meta', () => {
      const schema = z.string();
      const meta = getSchemaMetadata(schema);
      expect(meta, 'to be empty');
    });
  });
});
