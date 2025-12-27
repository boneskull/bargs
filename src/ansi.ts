import { stripVTControlCharacters } from 'node:util';

/**
 * ANSI escape code constants.
 */
const ansi = {
  bold: '\x1b[1m',
  boldOff: '\x1b[22m',
  colorOff: '\x1b[39m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
} as const;

/**
 * Wrap text with ANSI codes.
 */
const wrap = (open: string, close: string) => (text: string) =>
  `${open}${text}${close}`;

export const bold = wrap(ansi.bold, ansi.boldOff);
export const cyan = wrap(ansi.cyan, ansi.colorOff);
export const dim = wrap(ansi.dim, ansi.boldOff);
export const green = wrap(ansi.green, ansi.colorOff);
export const red = wrap(ansi.red, ansi.colorOff);
export const yellow = wrap(ansi.yellow, ansi.colorOff);

/**
 * Strip all ANSI escape codes from a string.
 */
export const stripAnsi = stripVTControlCharacters;
