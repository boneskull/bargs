/**
 * Tests for parser combinators: merge, map, handle.
 */
import { expect } from 'bupkis';
import { describe, it } from 'node:test';

import { camelCaseValues, handle, map, merge } from '../src/bargs.js';
import { opt, pos } from '../src/opt.js';

describe('merge()', () => {
  it('merges two parsers', () => {
    const parser = merge(
      opt.options({ verbose: opt.boolean() }),
      pos.positionals(pos.string({ name: 'file', required: true })),
    );

    expect(parser.__brand, 'to be', 'Parser');
    expect(parser.__optionsSchema, 'to satisfy', {
      verbose: { type: 'boolean' },
    });
    expect(parser.__positionalsSchema, 'to satisfy', [
      { name: 'file', type: 'string' },
    ]);
  });

  it('merges three parsers', () => {
    const parser = merge(
      opt.options({ verbose: opt.boolean() }),
      opt.options({ output: opt.string() }),
      pos.positionals(pos.string({ name: 'input' })),
    );

    expect(parser.__brand, 'to be', 'Parser');
    expect(parser.__optionsSchema, 'to satisfy', {
      output: { type: 'string' },
      verbose: { type: 'boolean' },
    });
  });

  it('later options override earlier ones', () => {
    const parser = merge(
      opt.options({ name: opt.string({ default: 'first' }) }),
      opt.options({ name: opt.string({ default: 'second' }) }),
    );

    expect(parser.__optionsSchema.name?.default, 'to be', 'second');
  });

  it('concatenates positionals', () => {
    const parser = merge(
      pos.positionals(pos.string({ name: 'a' })),
      pos.positionals(pos.string({ name: 'b' })),
    );

    expect(parser.__positionalsSchema, 'to have length', 2);
    expect(parser.__positionalsSchema[0]?.name, 'to be', 'a');
    expect(parser.__positionalsSchema[1]?.name, 'to be', 'b');
  });
});

describe('map()', () => {
  describe('curried form', () => {
    it('returns a function that transforms a parser', () => {
      const mapper = map(
        ({ values }: { values: { name: string | undefined } }) => ({
          positionals: [] as const,
          values: { ...values, mapped: true },
        }),
      );

      expect(mapper, 'to be a', 'function');

      const parser = opt.options({ name: opt.string() });
      const mapped = mapper(parser);

      expect(mapped.__brand, 'to be', 'Parser');
    });
  });

  describe('direct form', () => {
    it('transforms a parser directly', () => {
      const parser = opt.options({ count: opt.number() });
      const mapped = map(parser, ({ values }) => ({
        positionals: [] as const,
        values: { doubled: (values.count ?? 0) * 2 },
      }));

      expect(mapped.__brand, 'to be', 'Parser');
    });
  });

  it('transforms values', () => {
    const parser = map(
      opt.options({ name: opt.string({ default: 'world' }) }),
      ({ values }) => ({
        positionals: [] as const,
        values: { greeting: `Hello, ${values.name}!` },
      }),
    );

    expect(parser.__brand, 'to be', 'Parser');
  });

  it('transforms positionals', () => {
    const parser = map(
      pos.positionals(pos.string({ name: 'input', required: true })),
      ({ positionals }) => ({
        positionals: [positionals[0]?.toUpperCase()] as const,
        values: {},
      }),
    );

    expect(parser.__brand, 'to be', 'Parser');
  });
});

describe('handle()', () => {
  describe('curried form', () => {
    it('returns a function that creates a command', () => {
      const handler = handle(() => {
        // handler body
      });

      expect(handler, 'to be a', 'function');

      const parser = opt.options({ verbose: opt.boolean() });
      const command = handler(parser);

      expect(command.__brand, 'to be', 'Command');
      expect(command.handler, 'to be a', 'function');
    });
  });

  describe('direct form', () => {
    it('creates a command directly', () => {
      const parser = opt.options({ verbose: opt.boolean() });
      const command = handle(parser, () => {
        // handler body
      });

      expect(command.__brand, 'to be', 'Command');
      expect(command.handler, 'to be a', 'function');
    });
  });

  it('preserves options schema', () => {
    const command = handle(
      opt.options({ name: opt.string(), verbose: opt.boolean() }),
      () => {},
    );

    expect(command.__optionsSchema, 'to satisfy', {
      name: { type: 'string' },
      verbose: { type: 'boolean' },
    });
  });

  it('preserves positionals schema', () => {
    const command = handle(
      pos.positionals(pos.string({ name: 'input', required: true })),
      () => {},
    );

    expect(command.__positionalsSchema, 'to satisfy', [
      { name: 'input', required: true, type: 'string' },
    ]);
  });
});

describe('combined usage', () => {
  it('combines map and handle', () => {
    const command = handle(
      map(
        opt.options({
          name: opt.string({ default: 'world' }),
          verbose: opt.boolean(),
        }),
        ({ values }) => ({
          positionals: [] as const,
          values: {
            ...values,
            greeting: `Hello, ${values.name}!`,
          },
        }),
      ),
      ({ values: _values }) => {
        // Would log: _values.greeting, _values.verbose
      },
    );

    expect(command.__brand, 'to be', 'Command');
    expect(command.__optionsSchema, 'to satisfy', {
      name: { type: 'string' },
      verbose: { type: 'boolean' },
    });
  });

  it('combines positionals with map and handle', () => {
    const command = handle(
      map(
        pos.positionals(
          pos.string({ name: 'input', required: true }),
          pos.string({ name: 'output' }),
        ),
        ({ positionals }) => ({
          positionals,
          values: {
            input: positionals[0],
            output: positionals[1] ?? 'stdout',
          },
        }),
      ),
      ({ values: _values }) => {
        // Would process: _values.input -> _values.output
      },
    );

    expect(command.__brand, 'to be', 'Command');
    expect(command.__positionalsSchema, 'to satisfy', [
      { name: 'input', required: true },
      { name: 'output' },
    ]);
  });
});

describe('camelCaseValues()', () => {
  it('converts kebab-case keys to camelCase', () => {
    const result = camelCaseValues({
      positionals: [] as const,
      values: {
        'dry-run': true,
        'output-dir': '/tmp',
        verbose: false,
      },
    });

    expect(result.values, 'to satisfy', {
      dryRun: true,
      outputDir: '/tmp',
      verbose: false,
    });
    // Original keys should NOT exist
    expect(result.values, 'not to have key', 'output-dir');
    expect(result.values, 'not to have key', 'dry-run');
  });

  it('handles nested kebab-case', () => {
    const result = camelCaseValues({
      positionals: [] as const,
      values: { 'my-long-option-name': 'value' },
    });

    expect(result.values, 'to satisfy', { myLongOptionName: 'value' });
  });

  it('preserves positionals unchanged', () => {
    const result = camelCaseValues({
      positionals: ['file1', 'file2'] as const,
      values: { 'output-dir': '/tmp' },
    });

    expect(result.positionals, 'to satisfy', ['file1', 'file2']);
  });

  it('works with map() for type-safe transforms', () => {
    const parser = map(
      opt.options({
        'dry-run': opt.boolean(),
        'output-dir': opt.string({ default: '/tmp' }),
      }),
      camelCaseValues,
    );

    expect(parser.__brand, 'to be', 'Parser');
    expect(parser.__optionsSchema, 'to satisfy', {
      'dry-run': { type: 'boolean' },
      'output-dir': { type: 'string' },
    });
    // Note: schema keeps original keys, transform happens at runtime
  });
});
