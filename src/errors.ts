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
