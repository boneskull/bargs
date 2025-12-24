import { z, type ZodArray, type ZodTuple, type ZodTypeAny } from 'zod';

import type {
  BargsConfig,
  CommandBargsConfig,
  Handler,
  SimpleBargsConfig,
} from './types.js';

import { exitWithZodError } from './errors.js';
import { generateCommandHelp, generateHelp } from './help.js';
import { parseCommands, parseSimple } from './parser.js';
import { detectVersion } from './version.js';

export * from './ansi.js';
export * from './errors.js';
export * from './help.js';
export { parseCommands, parseSimple } from './parser.js';
export * from './schema.js';
export type * from './types.js';

/**
 * Check if config has commands.
 */
const hasCommands = (config: BargsConfig): config is CommandBargsConfig => {
  return 'commands' in config && config.commands !== undefined;
};

/**
 * Check for --help or --version flags.
 */
const checkBuiltinFlags = async (
  args: string[],
  config: BargsConfig,
): Promise<boolean> => {
  if (args.includes('--help') || args.includes('-h')) {
    // Check if it's command-specific help
    if (hasCommands(config)) {
      const commandIndex = args.findIndex(
        (arg) => !arg.startsWith('-') && arg !== '--help' && arg !== '-h',
      );
      if (commandIndex >= 0) {
        const commandName = args[commandIndex] as string;
        if (config.commands[commandName]) {
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

  return false;
};

/**
 * Main bargs function - command-based CLI. Accepts any ZodTypeAny for
 * globalOptions to support .transform() schemas. Must be first overload to
 * ensure configs with `commands` match this.
 */
export async function bargs<TGlobalOptions extends ZodTypeAny>(
  config: CommandBargsConfig<TGlobalOptions>,
): Promise<void>;

/**
 * Main bargs function - simple CLI with handler. Accepts any ZodTypeAny for
 * options to support .transform() schemas.
 */
export async function bargs<
  TOptions extends ZodTypeAny,
  TPositionals extends undefined | ZodArray<ZodTypeAny> | ZodTuple = undefined,
>(
  config: SimpleBargsConfig<TOptions, TPositionals> & {
    handler: Handler<z.infer<TOptions>>;
    options: TOptions;
  },
): Promise<void>;

/**
 * Main bargs function - simple CLI without handler. Accepts any ZodTypeAny for
 * options to support .transform() schemas.
 */
export async function bargs<
  TOptions extends ZodTypeAny,
  TPositionals extends undefined | ZodArray<ZodTypeAny> | ZodTuple = undefined,
>(
  config: SimpleBargsConfig<TOptions, TPositionals> & {
    options: TOptions;
  },
): Promise<
  (TPositionals extends ZodTypeAny
    ? { positionals: z.infer<TPositionals> }
    : object) &
    z.infer<TOptions>
>;

/**
 * Main bargs function implementation.
 */
export async function bargs(config: BargsConfig): Promise<unknown> {
  const args = config.args ?? process.argv.slice(2);

  // Check for --help and --version
  await checkBuiltinFlags(args, config);

  try {
    if (hasCommands(config)) {
      await parseCommands({
        args,
        commands: config.commands,
        defaultHandler: config.defaultHandler as
          | Handler<unknown>
          | string
          | undefined,
        globalAliases: config.globalAliases,
        globalOptions: config.globalOptions,
        name: config.name,
      });
      return;
    }

    // Simple CLI
    const simpleConfig = config as SimpleBargsConfig;
    const result = await parseSimple({
      aliases: simpleConfig.aliases,
      args,
      defaults: simpleConfig.defaults,
      options: simpleConfig.options ?? z.object({}),
      positionals: simpleConfig.positionals,
    });

    if (simpleConfig.handler) {
      await simpleConfig.handler(result);
      return;
    }

    return result;
  } catch (error) {
    if (error instanceof z.ZodError) {
      exitWithZodError(error, config.name);
    }
    throw error;
  }
}
