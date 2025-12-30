/**
 * Custom error classes for bargs.
 *
 * Defines the error hierarchy used throughout bargs:
 *
 * - {@link BargsError} - Base class for all bargs errors
 * - {@link HelpError} - Triggers help text display when user needs guidance
 * - {@link ValidationError} - Thrown when configuration validation fails
 *
 * @packageDocumentation
 */

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
 * Error thrown when bargs config validation fails.
 *
 * @param message - Description of what's invalid
 * @param path - Dot-notation path to the invalid property (e.g.,
 *   "options.verbose.aliases[0]")
 */
export class ValidationError extends BargsError {
  readonly path: string;

  constructor(path: string, message: string) {
    super(`Invalid config at "${path}": ${message}`);
    this.name = 'ValidationError';
    this.path = path;
  }
}
