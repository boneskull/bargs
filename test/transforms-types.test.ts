/**
 * Type-level tests for transforms and parser combinators.
 *
 * These tests validate TypeScript type inference by running actual code and
 * checking that the inferred types match expectations at runtime.
 */
import { expect } from 'bupkis';
import { describe, it } from 'node:test';

import { bargs, handle, map, merge } from '../src/bargs.js';
import { opt, pos } from '../src/opt.js';

describe('Parser type inference', () => {
  it('opt.options() infers values type', async () => {
    // Define parser with typed options
    const parser = opt.options({
      count: opt.number({ default: 0 }),
      flag: opt.boolean(),
      name: opt.string({ default: 'default' }),
    });

    // Verify the parser has correct brand
    expect(parser.__brand, 'to be', 'Parser');
    expect(parser.__optionsSchema, 'to satisfy', {
      count: { default: 0, type: 'number' },
      flag: { type: 'boolean' },
      name: { default: 'default', type: 'string' },
    });

    // Runtime test: use the parser in a CLI and verify values
    let result: unknown;
    const cli = bargs('test')
      .globals(parser)
      .command('run', opt.options({}), ({ values }) => {
        result = values;
      });

    await cli.parseAsync(['run', '--name', 'test', '--count', '5', '--flag']);

    expect(result, 'to satisfy', {
      count: 5,
      flag: true,
      name: 'test',
    });
  });

  it('pos.positionals() infers tuple type', async () => {
    // Define parser with positionals
    const parser = pos.positionals(
      pos.string({ name: 'input', required: true }),
      pos.number({ default: 8080, name: 'port' }),
    );

    expect(parser.__brand, 'to be', 'Parser');
    expect(parser.__positionalsSchema, 'to have length', 2);

    // Runtime test: verify positionals are parsed correctly
    let result: unknown;
    const cli = bargs('test').command('run', parser, ({ positionals }) => {
      result = positionals;
    });

    await cli.parseAsync(['run', 'file.txt', '3000']);

    expect(result, 'to satisfy', ['file.txt', 3000]);
  });

  it('map() infers transformed type', async () => {
    // Transform that changes the shape of values
    const parser = map(
      opt.options({ x: opt.number({ default: 0 }) }),
      ({ values }) => ({
        positionals: [] as const,
        values: { doubled: values.x * 2, original: values.x },
      }),
    );

    expect(parser.__brand, 'to be', 'Parser');

    // Runtime test: verify transformed values
    let result: unknown;
    const cli = bargs('test')
      .globals(parser)
      .command('run', opt.options({}), ({ values }) => {
        result = values;
      });

    await cli.parseAsync(['run', '--x', '21']);

    expect(result, 'to satisfy', {
      doubled: 42,
      original: 21,
    });
  });

  it('merge() infers combined type', async () => {
    const optParser = opt.options({ verbose: opt.boolean() });
    const posParser = pos.positionals(
      pos.string({ name: 'file', required: true }),
    );
    const merged = merge(optParser, posParser);

    expect(merged.__brand, 'to be', 'Parser');
    expect(merged.__optionsSchema, 'to satisfy', {
      verbose: { type: 'boolean' },
    });
    expect(merged.__positionalsSchema, 'to satisfy', [
      { name: 'file', type: 'string' },
    ]);

    // Runtime test: verify merged parsing
    let result: unknown;
    const cli = bargs('test').command('run', merged, (r) => {
      result = r;
    });

    await cli.parseAsync(['run', '--verbose', 'input.txt']);

    expect(result, 'to satisfy', {
      positionals: ['input.txt'],
      values: { verbose: true },
    });
  });
});

describe('Command type inference', () => {
  it('handle() infers handler parameter type', async () => {
    // The handler should receive the correct types
    let receivedValues: undefined | { name: string };
    let receivedPositionals: readonly [string] | undefined;

    const cmd = handle(
      pos.positionals(pos.string({ name: 'arg', required: true }))(
        opt.options({ name: opt.string({ default: 'world' }) }),
      ),
      ({ positionals, values }) => {
        // TypeScript should infer these types correctly
        receivedValues = values;
        receivedPositionals = positionals;
      },
    );

    expect(cmd.__brand, 'to be', 'Command');

    // Use the command
    const cli = bargs('test').command('run', cmd);
    await cli.parseAsync(['run', '--name', 'Alice', 'hello']);

    expect(receivedValues, 'to satisfy', { name: 'Alice' });
    expect(receivedPositionals, 'to satisfy', ['hello']);
  });

  it('handler receives globals + locals merged', async () => {
    // Global options
    const globals = opt.options({
      config: opt.string({ default: './config.json' }),
      verbose: opt.boolean({ default: false }),
    });

    // Command-local options
    const localOpts = opt.options({
      env: opt.enum(['dev', 'prod'], { default: 'dev' }),
      port: opt.number({ default: 3000 }),
    });

    let result: unknown;

    const cli = bargs('test')
      .globals(globals)
      .command('serve', localOpts, ({ values }) => {
        // Handler should receive both global and local options
        result = values;
      });

    await cli.parseAsync([
      'serve',
      '--verbose',
      '--port',
      '8080',
      '--env',
      'prod',
    ]);

    expect(result, 'to satisfy', {
      config: './config.json',
      env: 'prod',
      port: 8080,
      verbose: true,
    });
  });

  it('transformed handler receives transformed type', async () => {
    let result: unknown;

    const cli = bargs('test').command(
      'run',
      map(opt.options({ x: opt.number({ default: 1 }) }), ({ values }) => ({
        positionals: [] as const,
        values: { squared: values.x * values.x },
      })),
      ({ values }) => {
        // Handler receives transformed type, not original
        result = values;
      },
    );

    await cli.parseAsync(['run', '--x', '7']);

    expect(result, 'to satisfy', { squared: 49 });
  });
});
