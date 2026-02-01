/**
 * Theming system for colorized help output.
 *
 * Provides ANSI color codes, built-in themes (default, mono, ocean, warm), and
 * utilities for creating custom themes. Each theme defines colors for semantic
 * elements like flags, commands, descriptions, and section headers. Themes can
 * be customized by overriding individual color properties.
 *
 * @packageDocumentation
 */

import { stripVTControlCharacters } from 'node:util';

/**
 * Strip all ANSI escape codes from a string.
 *
 * @group Terminal
 */
export const stripAnsi = stripVTControlCharacters;

/**
 * A bargs color theme. All color properties are optional and fall back to the
 * default theme.
 *
 * @group Theming
 */
export interface Theme {
  colors?: Partial<ThemeColors>;
}

/**
 * Color codes for each semantic element in help output. Empty string means no
 * color (passthrough).
 *
 * @group Theming
 */
export interface ThemeColors {
  /** Command names (e.g., "init", "build") */
  command: string;
  /** Command aliases (e.g., "a", "ls") - shown dimmer than command names */
  commandAlias: string;
  /** The "default: " label text */
  defaultText: string;
  /** Default value annotations (e.g., "false", ""hello"") */
  defaultValue: string;
  /** Description text for options/commands */
  description: string;
  /** Epilog text (homepage, repository) */
  epilog: string;
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
  /** URL text (for linkified URLs) */
  url: string;
  /** Usage line text */
  usage: string;
}

/**
 * Theme input - either a theme name or a custom Theme object.
 *
 * @group Theming
 */
export type ThemeInput = keyof typeof themes | Theme;

/**
 * Internal resolved theme with all colors defined.
 */
interface ResolvedTheme {
  colors: ThemeColors;
}

/**
 * ANSI escape codes for building custom themes.
 *
 * Includes text styles (bold, italic, underline, etc.), foreground colors,
 * bright foreground colors, background colors, and bright background colors.
 *
 * @group Theming
 */
export const ansi = {
  bgBlack: '\x1b[40m',
  bgBlue: '\x1b[44m',
  bgBrightBlack: '\x1b[100m',
  bgBrightBlue: '\x1b[104m',
  bgBrightCyan: '\x1b[106m',
  bgBrightGreen: '\x1b[102m',
  bgBrightMagenta: '\x1b[105m',
  bgBrightRed: '\x1b[101m',
  bgBrightWhite: '\x1b[107m',
  bgBrightYellow: '\x1b[103m',
  bgCyan: '\x1b[46m',
  bgGreen: '\x1b[42m',
  bgMagenta: '\x1b[45m',
  bgRed: '\x1b[41m',
  bgWhite: '\x1b[47m',
  bgYellow: '\x1b[43m',
  black: '\x1b[30m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
  brightBlack: '\x1b[90m',
  brightBlue: '\x1b[94m',
  brightCyan: '\x1b[96m',
  brightGreen: '\x1b[92m',
  brightMagenta: '\x1b[95m',
  brightRed: '\x1b[91m',
  brightWhite: '\x1b[97m',
  brightYellow: '\x1b[93m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  hidden: '\x1b[8m',
  inverse: '\x1b[7m',
  italic: '\x1b[3m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
  strikethrough: '\x1b[9m',
  underline: '\x1b[4m',
  white: '\x1b[37m',
  yellow: '\x1b[33m',
} as const;

/**
 * Default color values used when theme colors are not specified.
 */
const defaultColors: ThemeColors = {
  command: ansi.bold + ansi.magenta,
  commandAlias: ansi.magenta,
  defaultText: ansi.yellow,
  defaultValue: ansi.green,
  description: '',
  epilog: ansi.yellow,
  example: ansi.green,
  flag: ansi.cyan,
  positional: ansi.brightMagenta,
  scriptName: ansi.bold + ansi.brightMagenta,
  sectionHeader: ansi.brightMagenta,
  type: ansi.magenta,
  url: ansi.cyan,
  usage: ansi.cyan,
};

/**
 * Built-in themes.
 *
 * @group Theming
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
      commandAlias: '',
      defaultText: '',
      defaultValue: '',
      description: '',
      epilog: '',
      example: '',
      flag: '',
      positional: '',
      scriptName: '',
      sectionHeader: '',
      type: '',
      url: '',
      usage: '',
    },
  },

  /** Ocean theme - blues and greens (bright) */
  ocean: {
    colors: {
      command: ansi.bold + ansi.brightCyan,
      commandAlias: ansi.cyan,
      defaultText: ansi.blue,
      defaultValue: ansi.green,
      description: ansi.white,
      epilog: ansi.blue,
      example: ansi.dim + ansi.white,
      flag: ansi.brightCyan,
      positional: ansi.brightGreen,
      scriptName: ansi.bold + ansi.brightBlue,
      sectionHeader: ansi.brightBlue,
      type: ansi.cyan,
      url: ansi.brightCyan,
      usage: ansi.white,
    },
  },

  /** Warm theme - reds and yellows */
  warm: {
    colors: {
      command: ansi.bold + ansi.yellow,
      commandAlias: ansi.dim + ansi.yellow,
      defaultText: ansi.dim + ansi.yellow,
      defaultValue: ansi.brightYellow,
      description: ansi.white,
      epilog: ansi.dim + ansi.yellow,
      example: ansi.white + ansi.dim,
      flag: ansi.brightYellow,
      positional: ansi.brightRed,
      scriptName: ansi.bold + ansi.red,
      sectionHeader: ansi.red,
      type: ansi.yellow,
      url: ansi.brightYellow,
      usage: ansi.white,
    },
  },
} as const satisfies Record<string, ResolvedTheme>;

/**
 * Default theme export for convenience.
 *
 * @group Theming
 */
export const defaultTheme = themes.default;

/**
 * Resolve a theme input to a fully resolved Theme with all colors defined.
 * Missing colors fall back to the default theme.
 *
 * @function
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
 *
 * @group Theming
 */
export type StyleFn = (text: string) => string;

/**
 * Styler object with methods for each semantic element.
 *
 * @group Theming
 */
export interface Styler {
  command: StyleFn;
  commandAlias: StyleFn;
  defaultText: StyleFn;
  defaultValue: StyleFn;
  description: StyleFn;
  epilog: StyleFn;
  example: StyleFn;
  flag: StyleFn;
  positional: StyleFn;
  scriptName: StyleFn;
  sectionHeader: StyleFn;
  type: StyleFn;
  url: StyleFn;
  usage: StyleFn;
}

/**
 * ANSI reset code.
 */
const RESET = '\x1b[0m';

/**
 * Create a style function from a color code. Returns passthrough if color is
 * empty.
 *
 * @function
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
 *
 * @function
 * @group Theming
 */
export const createStyler = (theme: Theme): Styler => {
  const resolved = getTheme(theme as ThemeInput);
  return {
    command: makeStyleFn(resolved.colors.command),
    commandAlias: makeStyleFn(resolved.colors.commandAlias),
    defaultText: makeStyleFn(resolved.colors.defaultText),
    defaultValue: makeStyleFn(resolved.colors.defaultValue),
    description: makeStyleFn(resolved.colors.description),
    epilog: makeStyleFn(resolved.colors.epilog),
    example: makeStyleFn(resolved.colors.example),
    flag: makeStyleFn(resolved.colors.flag),
    positional: makeStyleFn(resolved.colors.positional),
    scriptName: makeStyleFn(resolved.colors.scriptName),
    sectionHeader: makeStyleFn(resolved.colors.sectionHeader),
    type: makeStyleFn(resolved.colors.type),
    url: makeStyleFn(resolved.colors.url),
    usage: makeStyleFn(resolved.colors.usage),
  };
};
