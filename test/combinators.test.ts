/**
 * Tests for parser combinators: pipe, map, handle.
 */
import { expect } from 'bupkis';
import { describe, it } from 'node:test';

import { handle, map, pipe } from '../src/bargs.js';
import { opt, pos } from '../src/opt.js';

describe('pipe()', () => {
  it('passes through a single value', () => {
    const result = pipe(5, (x) => x * 2);
    expect(result, 'to be', 10);
  });

  it('composes multiple functions left-to-right', () => {
    const result = pipe(
      1,
      (x) => x + 1,
      (x) => x * 2,
      (x) => x + 10,
    );
    expect(result, 'to be', 14);
  });

  it('works with parsers', () => {
    const parser = pipe(
      opt.options({ verbose: opt.boolean() }),
      map(({ values }) => ({
        positionals: [] as const,
        values: { ...values, extra: 'added' },
      })),
    );

    expect(parser.__brand, 'to be', 'Parser');
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

  it('works in pipe to transform values', () => {
    const parser = pipe(
      opt.options({ name: opt.string({ default: 'world' }) }),
      map(({ values }) => ({
        positionals: [] as const,
        values: { greeting: `Hello, ${values.name}!` },
      })),
    );

    expect(parser.__brand, 'to be', 'Parser');
  });

  it('works in pipe to transform positionals', () => {
    const parser = pipe(
      pos.positionals(pos.string({ name: 'input', required: true })),
      map(({ positionals }) => ({
        positionals: [positionals[0]?.toUpperCase()] as const,
        values: {},
      })),
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

  it('creates command from parser in pipe', () => {
    const command = pipe(
      opt.options({ verbose: opt.boolean() }),
      handle(() => {
        // handler body
      }),
    );

    expect(command.__brand, 'to be', 'Command');
  });

  it('preserves options schema', () => {
    const command = pipe(
      opt.options({ name: opt.string(), verbose: opt.boolean() }),
      handle(() => {}),
    );

    expect(command.__optionsSchema, 'to satisfy', {
      name: { type: 'string' },
      verbose: { type: 'boolean' },
    });
  });

  it('preserves positionals schema', () => {
    const command = pipe(
      pos.positionals(pos.string({ name: 'input', required: true })),
      handle(() => {}),
    );

    expect(command.__positionalsSchema, 'to satisfy', [
      { name: 'input', required: true, type: 'string' },
    ]);
  });
});

describe('combined usage', () => {
  it('pipes options, map, and handle together', () => {
    const command = pipe(
      opt.options({
        name: opt.string({ default: 'world' }),
        verbose: opt.boolean(),
      }),
      map(({ values }) => ({
        positionals: [] as const,
        values: {
          ...values,
          greeting: `Hello, ${values.name}!`,
        },
      })),
      handle(({ values: _values }) => {
        // Would log: _values.greeting, _values.verbose
      }),
    );

    expect(command.__brand, 'to be', 'Command');
    expect(command.__optionsSchema, 'to satisfy', {
      name: { type: 'string' },
      verbose: { type: 'boolean' },
    });
  });

  it('pipes positionals with map and handle', () => {
    const command = pipe(
      pos.positionals(
        pos.string({ name: 'input', required: true }),
        pos.string({ name: 'output' }),
      ),
      map(({ positionals }) => ({
        positionals,
        values: {
          input: positionals[0],
          output: positionals[1] ?? 'stdout',
        },
      })),
      handle(({ values: _values }) => {
        // Would process: _values.input -> _values.output
      }),
    );

    expect(command.__brand, 'to be', 'Command');
    expect(command.__positionalsSchema, 'to satisfy', [
      { name: 'input', required: true },
      { name: 'output' },
    ]);
  });
});
