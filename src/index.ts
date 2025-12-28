// src/index.ts - Main entry point for bargs

// Re-export the main bargs function
export { bargs } from './bargs.js';

// Re-export errors
export { BargsError, HelpError } from './errors.js';

// Re-export help generators
export { generateCommandHelp, generateHelp } from './help.js';

// Re-export the opt builder
export { opt } from './opt.js';

// Re-export all types
export type {
  AnyCommandConfig,
  ArrayOption,
  BargsConfig,
  BargsConfigWithCommands,
  BargsResult,
  BooleanOption,
  CommandConfig,
  CountOption,
  EnumOption,
  Handler,
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
