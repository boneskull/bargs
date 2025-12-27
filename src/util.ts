import type { ZodArray, ZodTuple, ZodType } from 'zod';

import type {
  AnyCommandConfig,
  BargsConfig,
  BargsConfigWithCommands,
} from './types.js';

/**
 * Check if config has commands.
 */
export const hasCommands = <
  TOptions extends ZodType,
  TPositionals extends undefined | ZodArray | ZodTuple = undefined,
  TCommands extends Record<string, AnyCommandConfig> | undefined = undefined,
>(
  config: BargsConfig<TOptions, TPositionals, TCommands>,
): config is BargsConfig<TOptions, TPositionals, TCommands> &
  BargsConfigWithCommands<TOptions, TPositionals, NonNullable<TCommands>> => {
  return 'commands' in config && config.commands !== undefined;
};
