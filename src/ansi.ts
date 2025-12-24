import { stripVTControlCharacters } from 'node:util';

/**
 * ANSI escape code constants.
 */
export const ansi = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  boldOff: '\x1b[22m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  colorOff: '\x1b[39m',
} as const;

/**
 * Wrap text with ANSI codes.
 */
const wrap = (open: string, close: string) => (text: string) => `${open}${text}${close}`;

export const bold = wrap(ansi.bold, ansi.boldOff);
export const dim = wrap(ansi.dim, ansi.boldOff);
export const red = wrap(ansi.red, ansi.colorOff);
export const green = wrap(ansi.green, ansi.colorOff);
export const yellow = wrap(ansi.yellow, ansi.colorOff);
export const blue = wrap(ansi.blue, ansi.colorOff);
export const magenta = wrap(ansi.magenta, ansi.colorOff);
export const cyan = wrap(ansi.cyan, ansi.colorOff);
export const white = wrap(ansi.white, ansi.colorOff);

/**
 * Strip all ANSI escape codes from a string.
 */
export const stripAnsi = stripVTControlCharacters;
