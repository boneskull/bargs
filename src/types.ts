import type { z, ZodArray, ZodObject, ZodRawShape, ZodTuple } from 'zod';

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
 */
export interface CommandBargsConfig<
  TGlobalOptions extends ZodObject<ZodRawShape> = ZodObject<ZodRawShape>,
  TCommands extends Record<string, CommandConfig> = Record<
    string,
    CommandConfig
  >,
> {
  args?: string[];
  commands: TCommands;
  defaultHandler?: DefaultHandler<Inferred<TGlobalOptions>, TCommands>;
  description?: string;
  globalAliases?: TGlobalOptions extends ZodObject<infer S>
    ? Aliases<S>
    : never;
  globalOptions?: TGlobalOptions;
  name: string;
  version?: string;
}

/**
 * Command definition.
 */
export interface CommandConfig<
  TOptions extends ZodObject<ZodRawShape> = ZodObject<ZodRawShape>,
> {
  aliases?: TOptions extends ZodObject<infer S> ? Aliases<S> : never;
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
 */
export interface SimpleBargsConfig<
  TOptions extends ZodObject<ZodRawShape> = ZodObject<ZodRawShape>,
  TPositionals extends undefined | ZodArray<z.ZodTypeAny> | ZodTuple =
    undefined,
> {
  aliases?: TOptions extends ZodObject<infer S> ? Aliases<S> : never;
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
