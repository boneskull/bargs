/**
 * Tests for transforms via map() combinator.
 *
 * These tests exercise runtime transform behavior, including async transforms
 * and transform chaining.
 */
import { expect } from 'bupkis';
import { describe, it } from 'node:test';

import { bargs, map } from '../src/bargs.js';
import { opt, pos } from '../src/opt.js';
import { parseSimple } from '../src/parser.js';

describe('map()', () => {
  describe('values transforms', () => {
    it('transforms values in pipeline', async () => {
      let result: unknown;

      const cli = bargs('test-cli')
        .globals(
          map(
            opt.options({
              count: opt.number({ default: 1 }),
              name: opt.string({ default: 'world' }),
            }),
            ({ positionals, values }) => ({
              positionals,
              values: {
                ...values,
                greeting: `Hello, ${values.name}!`,
                tripled: values.count * 3,
              },
            }),
          ),
        )
        .command('test', opt.options({}), ({ values }) => {
          result = values;
        });

      await cli.parseAsync(['test', '--name', 'Alice', '--count', '5']);

      expect(result, 'to satisfy', {
        count: 5,
        greeting: 'Hello, Alice!',
        name: 'Alice',
        tripled: 15,
      });
    });

    it('infers transformed type', async () => {
      // This test validates that transforms change the type
      // and the handler receives the transformed type
      let receivedValue: undefined | { computed: number };

      const cli = bargs('test-cli')
        .globals(
          map(opt.options({ x: opt.number({ default: 0 }) }), ({ values }) => ({
            positionals: [] as const,
            values: { computed: values.x * 2 },
          })),
        )
        .command('run', opt.options({}), ({ values }) => {
          // Type inference: values should have computed, not x
          receivedValue = values as { computed: number };
        });

      await cli.parseAsync(['run', '--x', '21']);

      expect(receivedValue, 'to satisfy', { computed: 42 });
    });
  });

  describe('positionals transforms', () => {
    it('transforms positionals in pipeline', async () => {
      let result: unknown;

      const cli = bargs('test-cli').command(
        'upper',
        map(
          pos.positionals(pos.string({ name: 'text', required: true })),
          ({ positionals, values }) => ({
            positionals: [positionals[0].toUpperCase()] as const,
            values,
          }),
        ),
        ({ positionals }) => {
          result = positionals;
        },
      );

      await cli.parseAsync(['upper', 'hello']);

      expect(result, 'to satisfy', ['HELLO']);
    });

    it('infers transformed tuple type', async () => {
      // This validates that the transformed positional type is correct
      let result: readonly [number] | undefined;

      const cli = bargs('test-cli').command(
        'double',
        map(
          pos.positionals(pos.number({ name: 'num', required: true })),
          ({ positionals, values }) => ({
            positionals: [positionals[0] * 2] as const,
            values,
          }),
        ),
        ({ positionals }) => {
          result = positionals;
        },
      );

      await cli.parseAsync(['double', '21']);

      expect(result, 'to satisfy', [42]);
    });
  });

  describe('combined transforms', () => {
    it('transforms both values and positionals', async () => {
      let result: unknown;

      const cli = bargs('test-cli').command(
        'process',
        map(
          pos.positionals(pos.string({ name: 'input', required: true }))(
            opt.options({ prefix: opt.string({ default: '>' }) }),
          ),
          ({ positionals, values }) => ({
            positionals: [positionals[0].toUpperCase()] as const,
            values: { ...values, processed: true },
          }),
        ),
        ({ positionals, values }) => {
          result = { positionals, values };
        },
      );

      await cli.parseAsync(['process', '--prefix', '>>>', 'hello']);

      expect(result, 'to satisfy', {
        positionals: ['HELLO'],
        values: { prefix: '>>>', processed: true },
      });
    });
  });

  describe('async transforms', () => {
    it('supports async transform functions', async () => {
      let result: unknown;

      const cli = bargs('test-cli')
        .globals(
          map(
            opt.options({ delay: opt.number({ default: 1 }) }),
            async ({ positionals, values }) => {
              // Simulate async operation
              await new Promise((resolve) => setTimeout(resolve, values.delay));
              return {
                positionals,
                values: { ...values, timestamp: Date.now() },
              };
            },
          ),
        )
        .command('test', opt.options({}), ({ values }) => {
          result = values;
        });

      await cli.parseAsync(['test', '--delay', '1']);

      expect(result, 'to satisfy', {
        delay: 1,
        timestamp: expect.it('to be a', 'number'),
      });
    });

    it('rejects async transforms in sync parse()', () => {
      const cli = bargs('test-cli').globals(
        map(opt.options({ x: opt.number({ default: 0 }) }), async (result) => {
          await Promise.resolve();
          return result;
        }),
      );

      expect(
        () => cli.parse([]),
        'to throw',
        /Async.*transform.*Use parseAsync/,
      );
    });
  });

  describe('transform chaining', () => {
    it('chains multiple transforms in sequence', async () => {
      let result: unknown;

      // First transform: add greeting
      const addGreeting = map(
        opt.options({ name: opt.string({ default: 'world' }) }),
        ({ positionals, values }) => ({
          positionals,
          values: { ...values, greeting: `Hello, ${values.name}!` },
        }),
      );

      // Second transform: add timestamp
      const addTimestamp = map(addGreeting, ({ positionals, values }) => ({
        positionals,
        values: { ...values, ts: 12345 },
      }));

      const cli = bargs('test-cli')
        .globals(addTimestamp)
        .command('test', opt.options({}), ({ values }) => {
          result = values;
        });

      await cli.parseAsync(['test', '--name', 'Alice']);

      expect(result, 'to satisfy', {
        greeting: 'Hello, Alice!',
        name: 'Alice',
        ts: 12345,
      });
    });
  });
});

describe('direct parseSimple with transforms', () => {
  it('parseSimple does not apply transforms (raw parse)', () => {
    // parseSimple is the raw parser - it doesn't know about transforms
    const result = parseSimple({
      args: ['--name', 'Alice'],
      options: { name: { default: 'world', type: 'string' } },
      positionals: [],
    });

    expect(result.values, 'to satisfy', { name: 'Alice' });
    // No transform applied - just raw values
    expect(result.values, 'not to have key', 'greeting');
  });
});
