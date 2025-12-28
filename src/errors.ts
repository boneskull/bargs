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
 * Error that triggers help text display. Thrown when the user needs guidance.
 *
 * @param message - Error message to show before help text
 * @param command - Command name for command-specific help, undefined for
 *   general help
 */
export class HelpError extends BargsError {
  readonly command?: string;

  constructor(message: string, command?: string) {
    super(message);
    this.name = 'HelpError';
    this.command = command;
  }
}

/**
 * Format a validation error for CLI display.
 */
export const formatValidationError = (message: string): string => {
  const lines: string[] = [];

  lines.push('');
  lines.push(red(bold('Invalid arguments')));
  lines.push('');
  lines.push(`  ${message}`);
  lines.push('');

  return lines.join('\n');
};

/**
 * Print error and exit.
 */
export const exitWithError = (message: string, cliName: string): never => {
  console.error(message);
  console.error(dim(`Run '${cliName} --help' for usage.`));
  process.exit(1);
};
