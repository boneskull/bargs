/**
 * Tests for command parsing.
 *
 * These tests focus on command dispatching and parsing behaviors complementary
 * to the tests in bargs.test.ts.
 */
import { expect } from 'bupkis';
import { describe, it } from 'node:test';

import { bargs, handle } from '../src/bargs.js';
import { opt, pos } from '../src/opt.js';

/**
 * Helper to capture stderr output and process.exitCode during tests. Returns
 * the captured output, result, and exitCode.
 *
 * @function
 */
const withCapturedStderr = <T>(
  fn: () => Promise<T> | T,
): Promise<{
  exitCode: typeof process.exitCode;
  output: string;
  result: T;
}> => {
  const originalExitCode = process.exitCode;
  const stderrWrites: string[] = [];
  const originalStderrWrite = process.stderr.write.bind(process.stderr);

  process.stderr.write = ((chunk: unknown) => {
    stderrWrites.push(String(chunk));
    return true;
  }) as typeof process.stderr.write;

  /**
   * @function
   */
  const createResult = (result: T) => ({
    exitCode: process.exitCode,
    output: stderrWrites.join(''),
    result,
  });

  /**
   * @function
   */
  const cleanup = () => {
    process.stderr.write = originalStderrWrite;
    process.exitCode = originalExitCode;
  };

  try {
    const maybePromise = fn();
    if (maybePromise instanceof Promise) {
      return maybePromise.then((result) => {
        const capturedResult = createResult(result);
        cleanup();
        return capturedResult;
      });
    }
    const capturedResult = createResult(maybePromise);
    cleanup();
    return Promise.resolve(capturedResult);
  } catch (error) {
    cleanup();
    throw error;
  }
};

describe('command parsing', () => {
  it('parses a command with options', async () => {
    let result: unknown;

    const cli = bargs('test-cli').command(
      'greet',
      opt.options({
        loud: opt.boolean({ default: false }),
        name: opt.string({ default: 'world' }),
      }),
      ({ values }) => {
        result = values;
      },
    );

    await cli.parseAsync(['greet', '--name', 'Alice', '--loud']);

    expect(result, 'to satisfy', {
      loud: true,
      name: 'Alice',
    });
  });

  it('parses command positionals', async () => {
    let result: unknown;

    const cli = bargs('test-cli').command(
      'greet',
      pos.positionals(
        pos.string({ name: 'name', required: true }),
        pos.number({ default: 1, name: 'times' }),
      ),
      ({ positionals }) => {
        result = positionals;
      },
    );

    await cli.parseAsync(['greet', 'Alice', '3']);

    expect(result, 'to satisfy', ['Alice', 3]);
  });

  it('calls command handler', async () => {
    let handlerCalled = false;
    let receivedValues: unknown;
    let receivedPositionals: unknown;

    const cli = bargs('test-cli').command(
      'echo',
      handle(
        pos.positionals(pos.string({ name: 'message', required: true })),
        ({ positionals, values }) => {
          handlerCalled = true;
          receivedValues = values;
          receivedPositionals = positionals;
        },
      ),
    );

    await cli.parseAsync(['echo', 'Hello!']);

    expect(handlerCalled, 'to be', true);
    expect(receivedPositionals, 'to satisfy', ['Hello!']);
    expect(receivedValues, 'to satisfy', {});
  });

  it('uses defaultCommand when no command given', async () => {
    let result: unknown;

    const cli = bargs('test-cli')
      .command('run', opt.options({ verbose: opt.boolean() }), ({ values }) => {
        result = { command: 'run', values };
      })
      .command('build', opt.options({}), () => {
        result = { command: 'build' };
      })
      .defaultCommand('run');

    await cli.parseAsync(['--verbose']);

    expect(result, 'to satisfy', {
      command: 'run',
      values: { verbose: true },
    });
  });

  it('handles unknown command by showing help and setting exitCode', async () => {
    const cli = bargs('test-cli')
      .command(
        'add',
        handle(opt.options({}), () => {}),
      )
      .command(
        'remove',
        handle(opt.options({}), () => {}),
      );

    const { exitCode, output, result } = await withCapturedStderr(() =>
      cli.parseAsync(['unknown']),
    );

    expect(result.earlyExit, 'to be true');
    expect(exitCode, 'to equal', 1);
    expect(output, 'to contain', 'Unknown command: unknown');
  });

  it('merges global and command options', async () => {
    let result: unknown;

    const cli = bargs('test-cli')
      .globals(
        opt.options({
          config: opt.string({ default: './config.json' }),
          verbose: opt.boolean({ default: false }),
        }),
      )
      .command(
        'deploy',
        opt.options({
          env: opt.enum(['dev', 'staging', 'prod'], { default: 'dev' }),
          force: opt.boolean({ default: false }),
        }),
        ({ values }) => {
          result = values;
        },
      );

    await cli.parseAsync(['deploy', '--verbose', '--env', 'prod', '--force']);

    expect(result, 'to satisfy', {
      config: './config.json',
      env: 'prod',
      force: true,
      verbose: true,
    });
  });

  it('parses command with mixed options and positionals', async () => {
    let result: unknown;

    const cli = bargs('test-cli').command(
      'copy',
      handle(
        pos.positionals(
          pos.string({ name: 'source', required: true }),
          pos.string({ name: 'dest', required: true }),
        )(
          opt.options({
            force: opt.boolean({ aliases: ['f'] }),
            recursive: opt.boolean({ aliases: ['r'] }),
          }),
        ),
        ({ positionals, values }) => {
          result = { positionals, values };
        },
      ),
    );

    await cli.parseAsync(['copy', '-rf', 'src/', 'dst/']);

    expect(result, 'to satisfy', {
      positionals: ['src/', 'dst/'],
      values: { force: true, recursive: true },
    });
  });

  it('passes positionals through to default command', async () => {
    let result: unknown;

    const cli = bargs('test-cli')
      .command(
        'run',
        pos.positionals(pos.variadic('string', { name: 'files' })),
        ({ positionals }) => {
          result = positionals;
        },
      )
      .defaultCommand('run');

    // When no command matches, positionals go to default command
    await cli.parseAsync(['file1.js', 'file2.js', 'file3.js']);

    expect(result, 'to satisfy', [['file1.js', 'file2.js', 'file3.js']]);
  });
});
