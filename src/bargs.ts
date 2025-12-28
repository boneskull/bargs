// src/bargs.ts
import type {
  AnyCommandConfig,
  BargsConfig,
  BargsConfigWithCommands,
  BargsResult,
  InferOptions,
  InferPositionals,
  OptionsSchema,
  PositionalsSchema,
} from './types.js';

import { HelpError } from './errors.js';
import { generateCommandHelp, generateHelp } from './help.js';
import { parseCommands, parseSimple } from './parser.js';

/**
 * Check if config has commands.
 */
const hasCommands = (
  config: BargsConfig<
    OptionsSchema,
    PositionalsSchema,
    Record<string, AnyCommandConfig> | undefined
  >,
): config is BargsConfigWithCommands<
  OptionsSchema,
  PositionalsSchema,
  Record<string, AnyCommandConfig>
> => config.commands !== undefined && Object.keys(config.commands).length > 0;

/**
 * Main bargs entry point for simple CLIs (no commands).
 */
export async function bargs<
  TOptions extends OptionsSchema,
  TPositionals extends PositionalsSchema,
>(
  config: BargsConfig<TOptions, TPositionals, undefined>,
): Promise<
  BargsResult<InferOptions<TOptions>, InferPositionals<TPositionals>, undefined>
>;

/**
 * Main bargs entry point for command-based CLIs.
 */
export async function bargs<
  TOptions extends OptionsSchema,
  TCommands extends Record<string, AnyCommandConfig>,
>(
  config: BargsConfigWithCommands<TOptions, PositionalsSchema, TCommands>,
): Promise<BargsResult<InferOptions<TOptions>, unknown[], string | undefined>>;

/**
 * Main bargs entry point (implementation).
 */
export async function bargs(
  config: BargsConfig<
    OptionsSchema,
    PositionalsSchema,
    Record<string, AnyCommandConfig> | undefined
  >,
): Promise<BargsResult<unknown, unknown[], string | undefined>> {
  const args = config.args ?? process.argv.slice(2);

  try {
    // Handle --help
    if (args.includes('--help') || args.includes('-h')) {
      if (hasCommands(config)) {
        // Check for command-specific help: cmd --help
        const helpIndex = args.findIndex((a) => a === '--help' || a === '-h');
        const commandIndex = args.findIndex((a) => !a.startsWith('-'));

        if (commandIndex >= 0 && commandIndex < helpIndex) {
          const commandName = args[commandIndex]!;
          console.log(generateCommandHelp(config, commandName));
        } else {
          console.log(generateHelp(config));
        }
      } else {
        console.log(
          generateHelp(
            config as BargsConfig<OptionsSchema, PositionalsSchema, undefined>,
          ),
        );
      }
      process.exit(0);
    }

    // Handle --version
    if (args.includes('--version') && config.version) {
      console.log(config.version);
      process.exit(0);
    }

    // Parse
    if (hasCommands(config)) {
      return await parseCommands({ ...config, args });
    } else {
      const result = await parseSimple({
        args,
        options: config.options,
        positionals: config.positionals,
      });

      // Call handler if provided
      if (config.handler) {
        await config.handler(result);
      }

      return result;
    }
  } catch (error) {
    if (error instanceof HelpError) {
      console.error(error.message);
      if (hasCommands(config)) {
        console.log(generateHelp(config));
      } else {
        console.log(
          generateHelp(
            config as BargsConfig<OptionsSchema, PositionalsSchema, undefined>,
          ),
        );
      }
      process.exit(1);
    }
    throw error;
  }
}
