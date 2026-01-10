/**
 * Main entry point for the bargs CLI argument parser.
 *
 * Provides a combinator-style API for building type-safe CLIs.
 *
 * @example
 *
 * ```typescript
 * import { bargs, opt, pos } from '@boneskull/bargs';
 *
 * await bargs('my-app', { version: '1.0.0' })
 *   .globals(opt.options({ verbose: opt.boolean({ aliases: ['v'] }) }))
 *   .command(
 *     'greet',
 *     pos.positionals(pos.string({ name: 'name', required: true })),
 *     ({ positionals }) => console.log(`Hello, ${positionals[0]}!`),
 *     'Say hello',
 *   )
 *   .parseAsync();
 * ```
 *
 * @groupDescription Core API
 * The essential building blocks for creating CLIs with bargs.
 * Start here: `bargs()` creates a CLI, `opt` defines options, `pos` defines positionals.
 *
 * @groupDescription Combinators
 * Functions for composing and transforming parsers.
 * Use `map()` to transform results, `merge()` to combine parsers, and `handle()` to attach handlers.
 *
 * @groupDescription Transforms
 * Built-in transform functions for modifying parsed results.
 *
 * @groupDescription Help
 * Help text generation for CLI applications.
 * Customize help output with themes and formatting options.
 *
 * @groupDescription Theming
 * Styling and color customization for help output.
 * Includes ANSI codes, built-in themes, and custom theme support.
 *
 * @groupDescription Terminal
 * Terminal feature detection and utilities.
 * Includes hyperlink support detection and URL linkification.
 *
 * @groupDescription Errors
 * Custom error classes for bargs.
 *
 * @groupDescription Option Types
 * Type definitions for CLI option configurations.
 *
 * @groupDescription Positional Types
 * Type definitions for positional argument configurations.
 *
 * @groupDescription Parser Types
 * Core parser and result types for the combinator pipeline.
 *
 * @groupDescription Type Utilities
 * Advanced TypeScript utilities for type inference and transformation.
 *
 * @document ../site/content/architecture.md
 * @document ../site/content/changelog.md
 * @packageDocumentation
 */

// Main API
export { bargs, camelCaseValues, handle, map, merge } from './bargs.js';
export type { TransformFn } from './bargs.js';

// Errors
export { BargsError, HelpError, ValidationError } from './errors.js';

// Help generators
export { generateCommandHelp, generateHelp } from './help.js';
export type { HelpConfig } from './help.js';

// Option and positional builders
export { opt, pos } from './opt.js';
export type {
  CallableOptionsParser,
  CallablePositionalsParser,
  InferParserPositionals,
  InferParserValues,
} from './opt.js';

// OSC utilities for terminal hyperlinks
export { link, linkifyUrls, supportsHyperlinks } from './osc.js';

// Theme utilities
export {
  ansi,
  createStyler,
  defaultTheme,
  stripAnsi,
  themes,
} from './theme.js';

// Theme types
export type {
  StyleFn,
  Styler,
  Theme,
  ThemeColors,
  ThemeInput,
} from './theme.js';

// Core types
export type {
  // Option definitions
  ArrayOption,
  BooleanOption,
  // CamelCase utilities
  CamelCaseKeys,
  // Parser combinator types
  CliBuilder,
  CliResult,
  Command,
  CommandDef,
  // Command configuration
  CommandOptions,
  CountOption,
  CreateOptions,
  EnumArrayOption,
  EnumOption,
  // Positional definitions
  EnumPositional,
  HandlerFn,
  // Type inference
  InferOption,
  InferOptions,
  InferPositional,
  InferPositionals,
  InferTransformedPositionals,
  InferTransformedValues,
  KebabToCamel,
  NumberOption,
  NumberPositional,
  OptionDef,
  OptionsSchema,
  Parser,
  ParseResult,
  PositionalDef,
  PositionalsSchema,
  // Transform types
  PositionalsTransformFn,
  StringOption,
  StringPositional,
  TransformsConfig,
  ValuesTransformFn,
  VariadicPositional,
} from './types.js';
