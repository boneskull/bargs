import type { z, ZodObject, ZodTuple, ZodArray, ZodRawShape } from 'zod';

/**
 * Aliases map canonical option names to arrays of alias strings.
 *
 * @example
 *   { verbose: ['v'], config: ['c', 'config-file'] }
 */
export type Aliases<T extends ZodRawShape> = {
  [K in keyof T]?: string[];
};

/**
 * Inferred type from a Zod schema (after transforms).
 */
export type Inferred<T extends z.ZodTypeAny> = z.infer<T>;

/**
 * Handler function signature.
 */
export type Handler<TArgs> = (args: TArgs) => Promise<void> | void;

/**
 * Command definition.
 */
export interface CommandConfig<
  TOptions extends ZodObject<ZodRawShape> = ZodObject<ZodRawShape>,
  TPositionals extends ZodTuple | ZodArray<z.ZodTypeAny> | undefined = undefined,
> {
  description: string;
  options?: TOptions;
  positionals?: TPositionals;
  aliases?: TOptions extends ZodObject<infer S> ? Aliases<S> : never;
  handler: Handler<
    Inferred<TOptions> & (TPositionals extends z.ZodTypeAny ? { positionals: Inferred<TPositionals> } : object)
  >;
}

/**
 * Simple CLI config (no commands).
 */
export interface SimpleBargsConfig<
  TOptions extends ZodObject<ZodRawShape> = ZodObject<ZodRawShape>,
  TPositionals extends ZodTuple | ZodArray<z.ZodTypeAny> | undefined = undefined,
> {
  name: string;
  description?: string;
  version?: string;
  options?: TOptions;
  positionals?: TPositionals;
  aliases?: TOptions extends ZodObject<infer S> ? Aliases<S> : never;
  defaults?: Partial<Inferred<TOptions>>;
  handler?: Handler<
    Inferred<TOptions> & (TPositionals extends z.ZodTypeAny ? { positionals: Inferred<TPositionals> } : object)
  >;
  args?: string[];
}

/**
 * Default handler: either a command name or a handler function.
 */
export type DefaultHandler<TGlobalOptions, TCommands extends Record<string, CommandConfig>> =
  | keyof TCommands
  | Handler<TGlobalOptions>;

/**
 * Command-based CLI config.
 */
export interface CommandBargsConfig<
  TGlobalOptions extends ZodObject<ZodRawShape> = ZodObject<ZodRawShape>,
  TCommands extends Record<string, CommandConfig> = Record<string, CommandConfig>,
> {
  name: string;
  description?: string;
  version?: string;
  globalOptions?: TGlobalOptions;
  globalAliases?: TGlobalOptions extends ZodObject<infer S> ? Aliases<S> : never;
  commands: TCommands;
  defaultHandler?: DefaultHandler<Inferred<TGlobalOptions>, TCommands>;
  args?: string[];
}

/**
 * Union of all config types.
 */
export type BargsConfig = SimpleBargsConfig | CommandBargsConfig;
