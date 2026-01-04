/**
 * Main entry point for the bargs CLI argument parser.
 *
 * This module exports the primary `bargs` and `bargsAsync` functions with
 * attached option builder methods (e.g., `bargs.string()`, `bargs.boolean()`),
 * allowing both function-call and builder-namespace usage patterns. It also
 * re-exports all public types, error classes, help generators, theme utilities,
 * and OSC hyperlink functions.
 *
 * @example
 *
 * ```typescript
 * import { bargs } from 'bargs';
 *
 * // Use as function
 * const result = bargs({
 *   name: 'myapp',
 *   options: { verbose: bargs.boolean({ aliases: ['v'] }) },
 * });
 *
 * // Access builder namespace
 * const opts = bargs.options({ name: bargs.string() });
 * ```
 *
 * @packageDocumentation
 */

import { bargsAsync as bargsAsyncBase, bargs as bargsBase } from './bargs.js';
import { opt } from './opt.js';

/**
 * Main bargs entry point (sync). Also provides access to all opt builders via
 * bargs.string(), bargs.boolean(), etc.
 */
export const bargs = Object.assign(bargsBase, opt);

/**
 * Async bargs entry point. Also provides access to all opt builders via
 * bargsAsync.string(), etc.
 */
export const bargsAsync = Object.assign(bargsAsyncBase, opt);

// Re-export errors
export { BargsError, HelpError, ValidationError } from './errors.js';

// Re-export help generators
export { generateCommandHelp, generateHelp } from './help.js';

// Re-export opt types
export type { CommandBuilder } from './opt.js';

// Re-export OSC utilities for terminal hyperlinks
export { link, linkifyUrls, supportsHyperlinks } from './osc.js';

// Re-export theme utilities
export {
  ansi,
  createStyler,
  defaultTheme,
  stripAnsi,
  themes,
} from './theme.js';

// Re-export theme types
export type {
  StyleFn,
  Styler,
  Theme,
  ThemeColors,
  ThemeInput,
} from './theme.js';

// Re-export all types
export type {
  AnyCommandConfig,
  ArrayOption,
  BargsConfig,
  BargsConfigWithCommands,
  BargsOptions,
  BargsResult,
  BooleanOption,
  CommandConfig,
  CommandConfigInput,
  CountOption,
  EnumOption,
  EnumPositional,
  Handler,
  HandlerFn,
  InferCommandResult,
  InferOption,
  InferOptions,
  InferPositional,
  InferPositionals,
  InferredCommands,
  InferTransformedPositionals,
  InferTransformedValues,
  NumberOption,
  NumberPositional,
  OptionDef,
  OptionsSchema,
  PositionalDef,
  PositionalsSchema,
  PositionalsTransformFn,
  StringOption,
  StringPositional,
  TransformsConfig,
  ValuesTransformFn,
  VariadicPositional,
} from './types.js';
