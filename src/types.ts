import type { z, ZodArray, ZodRawShape, ZodTuple, ZodTypeAny } from 'zod';

/**
 * Aliases map canonical option names to arrays of alias strings.
 *
 * @example {verbose: ['v'], config: ['c', 'config-file']}
 */
export type Aliases<T extends ZodRawShape> = {
  [K in keyof T]?: string[];
};

/**
 * Union of all config types.
 */
export type BargsConfig = CommandBargsConfig | SimpleBargsConfig;

/**
 * Command-based CLI config.
 *
 * TGlobalOptions accepts ZodTypeAny to support schemas with .transform(). At
 * runtime, we unwrap to the inner ZodObject for parseArgs config extraction.
 */
export interface CommandBargsConfig<
  TGlobalOptions extends ZodTypeAny = ZodTypeAny,
  TCommands extends Record<string, CommandConfig> = Record<
    string,
    CommandConfig
  >,
> {
  args?: string[];
  commands: TCommands;
  defaultHandler?: DefaultHandler<Inferred<TGlobalOptions>, TCommands>;
  description?: string;
  globalAliases?: Aliases<ZodRawShape>;
  globalOptions?: TGlobalOptions;
  name: string;
  version?: string;
}

/**
 * Command definition.
 *
 * TOptions accepts ZodTypeAny to support schemas with .transform().
 */
export interface CommandConfig<TOptions extends ZodTypeAny = ZodTypeAny> {
  aliases?: Aliases<ZodRawShape>;
  description: string;
  handler: Handler<Inferred<TOptions> & { positionals?: unknown[] }>;
  options?: TOptions;
  positionals?: z.ZodTypeAny;
}

/**
 * Default handler: either a command name or a handler function.
 */
export type DefaultHandler<
  TGlobalOptions,
  TCommands extends Record<string, CommandConfig>,
> = Handler<TGlobalOptions> | keyof TCommands;

/**
 * Handler function signature.
 */
export type Handler<TArgs> = (args: TArgs) => Promise<void> | void;

/**
 * Inferred type from a Zod schema (after transforms).
 */
export type Inferred<T extends z.ZodTypeAny> = z.infer<T>;

/**
 * Simple CLI config (no commands).
 *
 * TOptions accepts ZodTypeAny to support schemas with .transform(). At runtime,
 * we unwrap to the inner ZodObject for parseArgs config extraction.
 */
export interface SimpleBargsConfig<
  TOptions extends ZodTypeAny = ZodTypeAny,
  TPositionals extends undefined | ZodArray<z.ZodTypeAny> | ZodTuple =
    undefined,
> {
  aliases?: Aliases<ZodRawShape>;
  args?: string[];
  defaults?: Partial<Inferred<TOptions>>;
  description?: string;
  handler?: Handler<
    Inferred<TOptions> &
      (TPositionals extends z.ZodTypeAny
        ? { positionals: Inferred<TPositionals> }
        : object)
  >;
  name: string;
  options?: TOptions;
  positionals?: TPositionals;
  version?: string;
}
