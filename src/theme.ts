// src/theme.ts

/**
 * A bargs color theme.
 */
export interface Theme {
  colors: ThemeColors;
}

/**
 * Color codes for each semantic element in help output. Empty string means no
 * color (passthrough).
 */
export interface ThemeColors {
  /** Command names (e.g., "init", "build") */
  command: string;
  /** Default value annotations (e.g., "default: false") */
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
 * Built-in themes.
 */
export const themes = {
  /** Default colorful theme */
  default: {
    colors: {
      command: ansi.bold,
      defaultValue: ansi.dim,
      description: '',
      example: ansi.dim,
      flag: ansi.cyan,
      positional: ansi.yellow,
      scriptName: ansi.bold,
      sectionHeader: ansi.yellow,
      type: ansi.cyan,
      usage: '',
    },
  },

  /** No colors (monochrome) */
  mono: {
    colors: {
      command: '',
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

  /** Ocean theme - blues and greens */
  ocean: {
    colors: {
      command: ansi.bold + ansi.cyan,
      defaultValue: ansi.dim,
      description: '',
      example: ansi.dim,
      flag: ansi.brightCyan,
      positional: ansi.green,
      scriptName: ansi.bold + ansi.blue,
      sectionHeader: ansi.blue,
      type: ansi.brightBlue,
      usage: '',
    },
  },

  /** Warm theme - reds and yellows */
  warm: {
    colors: {
      command: ansi.bold + ansi.yellow,
      defaultValue: ansi.dim,
      description: '',
      example: ansi.dim,
      flag: ansi.brightYellow,
      positional: ansi.brightRed,
      scriptName: ansi.bold + ansi.red,
      sectionHeader: ansi.red,
      type: ansi.yellow,
      usage: '',
    },
  },
} as const satisfies Record<string, Theme>;

/**
 * Default theme export for convenience.
 */
export const defaultTheme: Theme = themes.default;

/**
 * Resolve a theme input to a Theme object.
 */
export const getTheme = (input: ThemeInput): Theme => {
  if (typeof input === 'string') {
    return themes[input];
  }
  return input;
};
