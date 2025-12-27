import { z, type ZodArray, type ZodTuple, type ZodType } from 'zod';

import type {
  AnyCommandConfig,
  BargsConfig,
  BargsConfigWithCommands,
  BargsResult,
  InferredPositionals,
} from './types.js';

import { exitWithZodError } from './errors.js';
import { generateCommandHelp, generateHelp } from './help.js';
import { parseCommands, parseSimple } from './parser.js';
import { hasCommands } from './util.js';
import { detectVersion } from './version.js';

// Public API: Only export what users need
export { BargsError } from './errors.js';
export type {
  AnyCommandConfig,
  BargsConfig,
  BargsConfigWithCommands,
  BargsResult,
  CommandConfig,
  Handler,
  InferredPositionals,
  SchemaAliases,
} from './types.js';

import type { CommandConfig } from './types.js';

/**
 * Helper to define a command with proper type inference.
 *
 * TypeScript can't infer handler parameter types from sibling properties in
 * nested objects. This function guides inference so the handler receives
 * correctly typed `values` and `positionals` based on the command's schemas.
 *
 * @example
 *
 * ```ts
 * commands: {
 *   add: defineCommand({
 *     options: z.object({ force: z.boolean() }),
 *     handler: ({ values }) => {
 *       // values.force is correctly typed as boolean
 *     },
 *   }),
 * }
 * ```
 */
export const defineCommand = <
  TOptions extends ZodType = ZodType,
  TPositionals extends undefined | ZodArray | ZodTuple = undefined,
>(
  config: CommandConfig<TOptions, TPositionals>,
): CommandConfig<TOptions, TPositionals> => config;

/**
 * Check for --help or --version flags.
 */
const checkBuiltinFlags = async <
  TOptions extends ZodType,
  TPositionals extends undefined | ZodArray | ZodTuple,
  TCommands extends Record<string, AnyCommandConfig> | undefined,
>(
  args: string[],
  config: BargsConfig<TOptions, TPositionals, TCommands>,
): Promise<void> => {
  if (args.includes('--help') || args.includes('-h')) {
    // Check if it's command-specific help
    if (hasCommands(config)) {
      const commandIndex = args.findIndex(
        (arg) => !arg.startsWith('-') && arg !== '--help' && arg !== '-h',
      );
      if (commandIndex >= 0) {
        const commandName = args[commandIndex] as string;
        const commands = config.commands;
        if (commands[commandName]) {
          console.log(generateCommandHelp(config, commandName));
          process.exit(0);
        }
      }
    }
    console.log(generateHelp(config));
    process.exit(0);
  }

  if (args.includes('--version') || args.includes('-V')) {
    const version = await detectVersion(config.version);
    console.log(version ?? 'unknown');
    process.exit(0);
  }
};

/**
 * Main bargs function for simple CLI (no commands).
 */
export async function bargs<
  TOptions extends ZodType,
  TPositionals extends undefined | ZodArray | ZodTuple = undefined,
>(
  config: BargsConfig<TOptions, TPositionals, undefined>,
): Promise<
  BargsResult<z.infer<TOptions>, InferredPositionals<TPositionals>, undefined>
>;

/**
 * Main bargs function for command-based CLI.
 */
export async function bargs<
  TOptions extends ZodType = ZodType,
  TPositionals extends undefined | ZodArray | ZodTuple = undefined,
  TCommands extends Record<string, AnyCommandConfig> = Record<
    string,
    AnyCommandConfig
  >,
>(
  config: BargsConfigWithCommands<TOptions, TPositionals, TCommands>,
): Promise<BargsResult<z.infer<TOptions>, [], string | undefined>>;

/**
 * Main bargs function - parses CLI arguments.
 */
export async function bargs<
  TOptions extends ZodType = ZodType,
  TPositionals extends undefined | ZodArray | ZodTuple = undefined,
  TCommands extends Record<string, AnyCommandConfig> | undefined = undefined,
>(
  config:
    | BargsConfig<TOptions, TPositionals, TCommands>
    | BargsConfigWithCommands<TOptions, TPositionals, NonNullable<TCommands>>,
): Promise<
  BargsResult<
    z.infer<TOptions>,
    InferredPositionals<TPositionals>,
    TCommands extends undefined ? undefined : string | undefined
  >
> {
  const args = config.args ?? process.argv.slice(2);

  // Check for --help and --version
  await checkBuiltinFlags(
    args,
    config as BargsConfig<ZodType, undefined, undefined>,
  );

  try {
    if (hasCommands(config)) {
      const commandConfig = config as BargsConfigWithCommands;
      const result = await parseCommands({
        aliases: commandConfig.aliases,
        args,
        commands: commandConfig.commands,
        defaultHandler: commandConfig.defaultHandler,
        name: commandConfig.name,
        options: commandConfig.options,
      });
      return result as BargsResult<
        z.infer<TOptions>,
        InferredPositionals<TPositionals>,
        TCommands extends undefined ? undefined : string | undefined
      >;
    }

    // Simple CLI
    const simpleConfig = config as BargsConfig;
    const result = await parseSimple({
      aliases: simpleConfig.aliases,
      args,
      config: simpleConfig.config,
      options: simpleConfig.options ?? z.object({}),
      positionals: simpleConfig.positionals,
    });

    // Run handler if provided, then return result
    if (simpleConfig.handler) {
      await simpleConfig.handler(
        result as BargsResult<Record<string, unknown>, [], undefined>,
      );
    }

    return result as BargsResult<
      z.infer<TOptions>,
      InferredPositionals<TPositionals>,
      TCommands extends undefined ? undefined : string | undefined
    >;
  } catch (error) {
    if (error instanceof z.ZodError) {
      exitWithZodError(error, config.name);
    }
    throw error;
  }
}
