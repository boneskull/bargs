/**
 * Test utilities for mocking process.exit and capturing stderr.
 */

/**
 * Custom error thrown when process.exit is mocked and called.
 */
export class MockExitError extends Error {
  readonly exitCode: number;

  constructor(exitCode: number) {
    super(`process.exit(${exitCode}) was called`);
    this.name = 'MockExitError';
    this.exitCode = exitCode;
  }
}

/**
 * Helper to capture stderr output and mock process.exit during tests. Returns
 * the captured output and exit code.
 *
 * Uses `Promise.resolve(fn())` to handle both sync functions and any thenable,
 * ensuring cleanup always runs via `.finally()`.
 *
 * @function
 */
export const withMockedExit = <T>(
  fn: () => Promise<T> | T,
): Promise<{
  exitCode: number;
  output: string;
  result?: T;
}> => {
  const stderrWrites: string[] = [];
  const originalStderrWrite = process.stderr.write.bind(process.stderr);
  // eslint-disable-next-line @typescript-eslint/unbound-method -- we restore it in cleanup
  const originalExit = process.exit;

  process.stderr.write = ((chunk: unknown) => {
    stderrWrites.push(String(chunk));
    return true;
  }) as typeof process.stderr.write;

  // Mock process.exit to throw instead of actually exiting
  process.exit = ((code?: number) => {
    throw new MockExitError(code ?? 0);
  }) as typeof process.exit;

  /**
   * @function
   */
  const cleanup = () => {
    process.stderr.write = originalStderrWrite;
    process.exit = originalExit;
  };

  /**
   * @function
   */
  const handleMockExit = (error: unknown) => {
    if (error instanceof MockExitError) {
      return {
        exitCode: error.exitCode,
        output: stderrWrites.join(''),
        result: undefined,
      };
    }
    throw error;
  };

  // Use Promise.resolve() to normalize sync/async and handle any thenable
  return Promise.resolve()
    .then(fn)
    .then((result) => ({
      exitCode: 0,
      output: stderrWrites.join(''),
      result,
    }))
    .catch(handleMockExit)
    .finally(cleanup);
};
