// src/index.ts - Main entry point for bargs

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

export default bargs;

// Re-export errors
export { BargsError, HelpError } from './errors.js';

// Re-export help generators
export { generateCommandHelp, generateHelp } from './help.js';

// Re-export the opt builder
export { opt };

// Re-export isThenable for advanced use cases
export { isThenable } from './parser.js';

// Re-export all types
export type {
  AnyCommandConfig,
  ArrayOption,
  BargsConfig,
  BargsConfigWithCommands,
  BargsResult,
  BooleanOption,
  CommandConfig,
  CommandConfigInput,
  CountOption,
  EnumOption,
  Handler,
  HandlerFn,
  InferOption,
  InferOptions,
  InferPositional,
  InferPositionals,
  NumberOption,
  NumberPositional,
  OptionDef,
  OptionsSchema,
  PositionalDef,
  PositionalsSchema,
  StringOption,
  StringPositional,
  VariadicPositional,
} from './types.js';
