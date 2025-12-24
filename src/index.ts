import { z, type ZodObject, type ZodRawShape, type ZodTypeAny, type ZodTuple, type ZodArray } from 'zod';
import { parseSimple, parseCommands } from './parser.js';
import { generateHelp, generateCommandHelp } from './help.js';
import { exitWithZodError } from './errors.js';
import { detectVersion } from './version.js';
import type {
  SimpleBargsConfig,
  CommandBargsConfig,
  BargsConfig,
  Handler,
} from './types.js';

export * from './types.js';
export * from './ansi.js';
export * from './errors.js';
export * from './help.js';
export * from './schema.js';
export { parseSimple, parseCommands } from './parser.js';

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
      const commandIndex = args.findIndex((arg) => !arg.startsWith('-') && arg !== '--help' && arg !== '-h');
      if (commandIndex >= 0) {
        const commandName = args[commandIndex];
        if (config.commands[commandName]) {
          console.log(generateCommandHelp(config as CommandBargsConfig, commandName));
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
 * Main bargs function - simple CLI with handler.
 */
export async function bargs<
  TOptions extends ZodObject<ZodRawShape> | z.ZodEffects<ZodObject<ZodRawShape>>,
  TPositionals extends ZodTuple | ZodArray<ZodTypeAny> | undefined = undefined,
>(
  config: SimpleBargsConfig<
    TOptions extends z.ZodEffects<infer I> ? (I extends ZodObject<ZodRawShape> ? I : never) : TOptions,
    TPositionals
  > & { options: TOptions; handler: Handler<unknown> },
): Promise<void>;

/**
 * Main bargs function - simple CLI without handler.
 */
export async function bargs<
  TOptions extends ZodObject<ZodRawShape> | z.ZodEffects<ZodObject<ZodRawShape>>,
  TPositionals extends ZodTuple | ZodArray<ZodTypeAny> | undefined = undefined,
>(
  config: SimpleBargsConfig<
    TOptions extends z.ZodEffects<infer I> ? (I extends ZodObject<ZodRawShape> ? I : never) : TOptions,
    TPositionals
  > & { options: TOptions },
): Promise<
  z.infer<TOptions> & (TPositionals extends ZodTypeAny ? { positionals: z.infer<TPositionals> } : object)
>;

/**
 * Main bargs function - command-based CLI.
 */
export async function bargs(config: CommandBargsConfig): Promise<void>;

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
        name: config.name,
        globalOptions: config.globalOptions,
        globalAliases: config.globalAliases,
        commands: config.commands,
        defaultHandler: config.defaultHandler,
        args,
      });
      return;
    }

    // Simple CLI
    const simpleConfig = config as SimpleBargsConfig;
    const result = await parseSimple({
      options: simpleConfig.options ?? z.object({}),
      positionals: simpleConfig.positionals,
      aliases: simpleConfig.aliases,
      defaults: simpleConfig.defaults,
      args,
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
