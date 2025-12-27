import type { ZodError } from 'zod';

import { bold, dim, red } from './ansi.js';

/**
 * Custom error class for bargs errors.
 */
export class BargsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BargsError';
  }
}

/**
 * Format a Zod error for CLI display.
 */
export const formatZodError = (error: ZodError): string => {
  const lines: string[] = [];

  lines.push('');
  lines.push(red(bold('Invalid arguments')));
  lines.push('');

  // Use issues directly for better path handling
  for (const issue of error.issues) {
    const path = issue.path.join('.');
    const flagName = path.includes('.') ? path : `--${path}`;
    lines.push(`  ${bold(flagName)}  ${issue.message}`);
  }

  lines.push('');

  return lines.join('\n');
};

/**
 * Print error and exit.
 */
const exitWithError = (message: string, cliName: string): never => {
  console.error(message);
  console.error(dim(`Run '${cliName} --help' for usage.`));
  process.exit(1);
  // TypeScript doesn't know process.exit never returns
  throw new Error('Unreachable');
};

/**
 * Print Zod error and exit.
 */
export const exitWithZodError = (error: ZodError, cliName: string): never => {
  const formatted = formatZodError(error);
  return exitWithError(formatted, cliName);
};
