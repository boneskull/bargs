/**
 * Core bargs parsing functions for both sync and async CLI execution.
 *
 * Provides `bargs()` (synchronous) and `bargsAsync()` (asynchronous) entry
 * points that handle configuration validation, built-in `--help` and
 * `--version` flags, argument parsing, and handler invocation. Supports both
 * simple CLIs with options/positionals and command-based CLIs with
 * subcommands.
 *
 * @packageDocumentation
 */

import type {
  BargsConfig,
  BargsConfigWithCommands,
  BargsOptions,
  BargsResult,
  CommandConfigInput,
  InferOptions,
  InferPositionals,
  OptionsSchema,
  PositionalsSchema,
} from './types.js';

import { HelpError } from './errors.js';
import { generateCommandHelp, generateHelp } from './help.js';
import {
  parseCommandsAsync,
  parseCommandsSync,
  parseSimple,
  runHandlers,
  runSyncHandlers,
} from './parser.js';
import { defaultTheme, getTheme, type Theme } from './theme.js';
import { validateConfig } from './validate.js';

/**
 * Check if config has commands.
 */
const hasCommands = (
  config: BargsConfig<
    OptionsSchema,
    PositionalsSchema,
    Record<string, CommandConfigInput> | undefined
  >,
): config is BargsConfigWithCommands<
  OptionsSchema,
  Record<string, CommandConfigInput>
> => config.commands !== undefined && Object.keys(config.commands).length > 0;

/**
 * Check if user defined their own help option (by name or alias).
 */
const hasUserDefinedHelp = (options?: OptionsSchema): boolean => {
  if (!options) {
    return false;
  }
  if ('help' in options) {
    return true;
  }
  // Check if any option has 'h' as an alias
  return Object.values(options).some((opt) => opt.aliases?.includes('h'));
};

/**
 * Check if user defined their own version option (by name or alias).
 */
const hasUserDefinedVersion = (options?: OptionsSchema): boolean => {
  if (!options) {
    return false;
  }
  if ('version' in options) {
    return true;
  }
  // Check if any option has 'V' as an alias
  return Object.values(options).some((opt) => opt.aliases?.includes('V'));
};

/**
 * Handle help and version flags. Returns true if we should exit.
 */
const handleBuiltinFlags = (
  config: BargsConfig<
    OptionsSchema,
    PositionalsSchema,
    Record<string, CommandConfigInput> | undefined
  >,
  args: string[],
  theme: Theme = defaultTheme,
): boolean => {
  // Handle --help (unless user defined their own help option)
  const userDefinedHelp = hasUserDefinedHelp(config.options);
  if (!userDefinedHelp && (args.includes('--help') || args.includes('-h'))) {
    if (hasCommands(config)) {
      // Check for command-specific help: cmd --help
      const helpIndex = args.findIndex((a) => a === '--help' || a === '-h');
      const commandIndex = args.findIndex((a) => !a.startsWith('-'));

      if (commandIndex >= 0 && commandIndex < helpIndex) {
        const commandName = args[commandIndex]!;
        console.log(generateCommandHelp(config, commandName, theme));
      } else {
        console.log(generateHelp(config, theme));
      }
    } else {
      console.log(
        generateHelp(
          config as BargsConfig<OptionsSchema, PositionalsSchema, undefined>,
          theme,
        ),
      );
    }
    process.exit(0);
  }

  // Handle --version (unless user defined their own version option)
  const userDefinedVersion = hasUserDefinedVersion(config.options);
  if (!userDefinedVersion && args.includes('--version') && config.version) {
    console.log(config.version);
    process.exit(0);
  }

  return false;
};

/**
 * Handle HelpError by printing message and help text.
 */
const handleHelpError = (
  error: unknown,
  config: BargsConfig<
    OptionsSchema,
    PositionalsSchema,
    Record<string, CommandConfigInput> | undefined
  >,
  theme: Theme = defaultTheme,
): never => {
  if (error instanceof HelpError) {
    console.error(error.message);
    if (hasCommands(config)) {
      console.log(generateHelp(config, theme));
    } else {
      console.log(
        generateHelp(
          config as BargsConfig<OptionsSchema, PositionalsSchema, undefined>,
          theme,
        ),
      );
    }
    process.exit(1);
  }
  throw error;
};

// ─── Sync API ───────────────────────────────────────────────────────────────

/**
 * Main bargs entry point for simple CLIs (no commands) - sync version. Throws
 * if any handler returns a thenable.
 */
export function bargs<
  const TOptions extends OptionsSchema,
  const TPositionals extends PositionalsSchema,
>(
  config: BargsConfig<TOptions, TPositionals, undefined>,
  options?: BargsOptions,
): BargsResult<
  InferOptions<TOptions>,
  InferPositionals<TPositionals>,
  undefined
>;

/**
 * Main bargs entry point for command-based CLIs - sync version. Throws if any
 * handler returns a thenable.
 */
export function bargs<
  const TOptions extends OptionsSchema,
  const TCommands extends Record<string, CommandConfigInput>,
>(
  config: BargsConfigWithCommands<TOptions, TCommands>,
  options?: BargsOptions,
): BargsResult<InferOptions<TOptions>, readonly unknown[], string | undefined>;

/**
 * Main bargs entry point (sync implementation). Throws BargsError if any
 * handler returns a thenable.
 */
export function bargs(
  config: BargsConfig<
    OptionsSchema,
    PositionalsSchema,
    Record<string, CommandConfigInput> | undefined
  >,
  options?: BargsOptions,
): BargsResult<unknown, readonly unknown[], string | undefined> {
  // Validate config upfront (throws ValidationError if invalid)
  validateConfig(config);

  const args = config.args ?? process.argv.slice(2);
  const theme: Theme = options?.theme
    ? getTheme(options.theme)
    : getTheme('default');

  try {
    handleBuiltinFlags(config, args, theme);

    // Parse
    if (hasCommands(config)) {
      return parseCommandsSync({ ...config, args });
    } else {
      const result = parseSimple({
        args,
        options: config.options,
        positionals: config.positionals,
      });

      // Call handler(s) if provided (sync)
      if (config.handler) {
        runSyncHandlers(config.handler, result);
      }

      return result;
    }
  } catch (error) {
    return handleHelpError(error, config, theme);
  }
}

// ─── Async API ──────────────────────────────────────────────────────────────

/**
 * Main bargs entry point for simple CLIs (no commands) - async version.
 */
export async function bargsAsync<
  TOptions extends OptionsSchema,
  TPositionals extends PositionalsSchema,
>(
  config: BargsConfig<TOptions, TPositionals, undefined>,
  options?: BargsOptions,
): Promise<
  BargsResult<InferOptions<TOptions>, InferPositionals<TPositionals>, undefined>
>;

/**
 * Main bargs entry point for command-based CLIs - async version.
 */
export async function bargsAsync<
  TOptions extends OptionsSchema,
  TCommands extends Record<string, CommandConfigInput>,
>(
  config: BargsConfigWithCommands<TOptions, TCommands>,
  options?: BargsOptions,
): Promise<
  BargsResult<InferOptions<TOptions>, readonly unknown[], string | undefined>
>;

/**
 * Main bargs entry point (async implementation). Awaits all handlers,
 * supporting async handlers.
 */
export async function bargsAsync(
  config: BargsConfig<
    OptionsSchema,
    PositionalsSchema,
    Record<string, CommandConfigInput> | undefined
  >,
  options?: BargsOptions,
): Promise<BargsResult<unknown, readonly unknown[], string | undefined>> {
  // Validate config upfront (throws ValidationError if invalid)
  validateConfig(config);

  const args = config.args ?? process.argv.slice(2);
  const theme: Theme = options?.theme
    ? getTheme(options.theme)
    : getTheme('default');

  try {
    handleBuiltinFlags(config, args, theme);

    // Parse
    if (hasCommands(config)) {
      return await parseCommandsAsync({ ...config, args });
    } else {
      const result = parseSimple({
        args,
        options: config.options,
        positionals: config.positionals,
      });

      // Call handler(s) if provided (async)
      if (config.handler) {
        await runHandlers(config.handler, result);
      }

      return result;
    }
  } catch (error) {
    return handleHelpError(error, config, theme);
  }
}
