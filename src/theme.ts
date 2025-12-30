// src/theme.ts

import { stripVTControlCharacters } from 'node:util';

/**
 * Strip all ANSI escape codes from a string.
 */
export const stripAnsi = stripVTControlCharacters;

/**
 * A bargs color theme. All color properties are optional and fall back to the
 * default theme.
 */
export interface Theme {
  colors?: Partial<ThemeColors>;
}

/**
 * Color codes for each semantic element in help output. Empty string means no
 * color (passthrough).
 */
export interface ThemeColors {
  /** Command names (e.g., "init", "build") */
  command: string;
  /** The "default: " label text */
  defaultText: string;
  /** Default value annotations (e.g., "false", ""hello"") */
  defaultValue: string;
  /** Description text for options/commands */
  description: string;
  /** Example code/commands */
  example: string;
  /** Flag names (e.g., "--verbose", "-v") */
  flag: string;
  /** Positional argument names (e.g., "<file>") */
  positional: string;
  /** CLI name shown in header (e.g., "myapp") */
  scriptName: string;
  /** Section headers (e.g., "USAGE", "OPTIONS") */
  sectionHeader: string;
  /** Type annotations (e.g., "[string]", "[number]") */
  type: string;
  /** Usage line text */
  usage: string;
}

/**
 * Theme input - either a theme name or a custom Theme object.
 */
export type ThemeInput = keyof typeof themes | Theme;

/**
 * Internal resolved theme with all colors defined.
 */
interface ResolvedTheme {
  colors: ThemeColors;
}

/**
 * ANSI escape codes.
 */
const ansi = {
  blue: '\x1b[34m',
  bold: '\x1b[1m',
  brightBlack: '\x1b[90m',
  brightBlue: '\x1b[94m',
  brightCyan: '\x1b[96m',
  brightGreen: '\x1b[92m',
  brightMagenta: '\x1b[95m',
  brightRed: '\x1b[91m',
  brightYellow: '\x1b[93m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
  white: '\x1b[37m',
  yellow: '\x1b[33m',
} as const;

/**
 * Default color values used when theme colors are not specified.
 */
const defaultColors: ThemeColors = {
  command: ansi.bold,
  defaultText: ansi.dim,
  defaultValue: ansi.white,
  description: ansi.white,
  example: ansi.white + ansi.dim,
  flag: ansi.brightCyan,
  positional: ansi.magenta,
  scriptName: ansi.bold,
  sectionHeader: ansi.brightMagenta,
  type: ansi.magenta,
  usage: ansi.cyan,
};

/**
 * Built-in themes.
 */
export const themes = {
  /** Default colorful theme */
  default: {
    colors: { ...defaultColors },
  },

  /** No colors (monochrome) */
  mono: {
    colors: {
      command: '',
      defaultText: '',
      defaultValue: '',
      description: '',
      example: '',
      flag: '',
      positional: '',
      scriptName: '',
      sectionHeader: '',
      type: '',
      usage: '',
    },
  },

  /** Ocean theme - blues and greens (bright) */
  ocean: {
    colors: {
      command: ansi.bold + ansi.brightCyan,
      defaultText: ansi.blue,
      defaultValue: ansi.green,
      description: ansi.white,
      example: ansi.dim + ansi.white,
      flag: ansi.brightCyan,
      positional: ansi.brightGreen,
      scriptName: ansi.bold + ansi.brightBlue,
      sectionHeader: ansi.brightBlue,
      type: ansi.cyan,
      usage: ansi.white,
    },
  },

  /** Warm theme - reds and yellows */
  warm: {
    colors: {
      command: ansi.bold + ansi.yellow,
      defaultText: ansi.dim + ansi.yellow,
      defaultValue: ansi.brightYellow,
      description: ansi.white,
      example: ansi.white + ansi.dim,
      flag: ansi.brightYellow,
      positional: ansi.brightRed,
      scriptName: ansi.bold + ansi.red,
      sectionHeader: ansi.red,
      type: ansi.yellow,
      usage: ansi.white,
    },
  },
} as const satisfies Record<string, ResolvedTheme>;

/**
 * Default theme export for convenience.
 */
export const defaultTheme: ResolvedTheme = themes.default;

/**
 * Resolve a theme input to a fully resolved Theme with all colors defined.
 * Missing colors fall back to the default theme.
 */
export const getTheme = (input: ThemeInput): ResolvedTheme => {
  if (typeof input === 'string') {
    return themes[input];
  }
  // Merge with defaults for partial themes
  return {
    colors: { ...defaultColors, ...input.colors },
  };
};

/**
 * Style function that wraps text with ANSI codes.
 */
export type StyleFn = (text: string) => string;

/**
 * Styler object with methods for each semantic element.
 */
export interface Styler {
  command: StyleFn;
  defaultText: StyleFn;
  defaultValue: StyleFn;
  description: StyleFn;
  example: StyleFn;
  flag: StyleFn;
  positional: StyleFn;
  scriptName: StyleFn;
  sectionHeader: StyleFn;
  type: StyleFn;
  usage: StyleFn;
}

/**
 * ANSI reset code.
 */
const RESET = '\x1b[0m';

/**
 * Create a style function from a color code. Returns passthrough if color is
 * empty.
 */
const makeStyleFn = (color: string): StyleFn => {
  if (!color) {
    return (text: string) => text;
  }
  return (text: string) => `${color}${text}${RESET}`;
};

/**
 * Create a Styler from a Theme. If the theme has missing colors, they fall back
 * to the default theme.
 */
export const createStyler = (theme: Theme): Styler => {
  const resolved = getTheme(theme as ThemeInput);
  return {
    command: makeStyleFn(resolved.colors.command),
    defaultText: makeStyleFn(resolved.colors.defaultText),
    defaultValue: makeStyleFn(resolved.colors.defaultValue),
    description: makeStyleFn(resolved.colors.description),
    example: makeStyleFn(resolved.colors.example),
    flag: makeStyleFn(resolved.colors.flag),
    positional: makeStyleFn(resolved.colors.positional),
    scriptName: makeStyleFn(resolved.colors.scriptName),
    sectionHeader: makeStyleFn(resolved.colors.sectionHeader),
    type: makeStyleFn(resolved.colors.type),
    usage: makeStyleFn(resolved.colors.usage),
  };
};
