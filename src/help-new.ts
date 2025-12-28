// src/help-new.ts
import type {
  AnyCommandConfig,
  BargsConfig,
  BargsConfigWithCommands,
  OptionDef,
  OptionsSchema,
} from './types-new.js';

import { bold, cyan, dim, yellow } from './ansi.js';

/**
 * Get type label for help display.
 */
const getTypeLabel = (def: OptionDef): string => {
  switch (def.type) {
    case 'boolean':
      return 'boolean';
    case 'number':
      return 'number';
    case 'string':
      return 'string';
    case 'count':
      return 'count';
    case 'enum':
      return def.choices.join(' | ');
    case 'array':
      return `${def.items}[]`;
    default:
      return 'string';
  }
};

/**
 * Format a single option for help output.
 */
const formatOptionHelp = (name: string, def: OptionDef): string => {
  const parts: string[] = [];

  // Build flag string: -v, --verbose
  const shortAlias = def.aliases?.find((a) => a.length === 1);
  const flagStr = shortAlias ? `-${shortAlias}, --${name}` : `    --${name}`;
  parts.push(`  ${flagStr}`);

  // Pad to align descriptions
  const padding = Math.max(0, 24 - flagStr.length - 2);
  parts.push(' '.repeat(padding));

  // Description
  if (def.description) {
    parts.push(def.description);
  }

  // Type and default
  const typeLabel = getTypeLabel(def);
  const suffixParts = [cyan(`[${typeLabel}]`)];
  if ('default' in def && def.default !== undefined) {
    suffixParts.push(dim(`default: ${JSON.stringify(def.default)}`));
  }

  parts.push('  ', suffixParts.join(' '));

  return parts.join('');
};

/**
 * Check if config has commands.
 */
const hasCommands = (
  config: BargsConfig<OptionsSchema, [], Record<string, AnyCommandConfig> | undefined>,
): config is BargsConfigWithCommands<OptionsSchema, [], Record<string, AnyCommandConfig>> =>
  config.commands !== undefined && Object.keys(config.commands).length > 0;

/**
 * Generate help text for a bargs config.
 */
export const generateHelp = <
  TOptions extends OptionsSchema = OptionsSchema,
  TCommands extends Record<string, AnyCommandConfig> | undefined = undefined,
>(
  config: BargsConfig<TOptions, [], TCommands>,
): string => {
  const lines: string[] = [];

  // Header
  const version = config.version ? ` v${config.version}` : '';
  lines.push('');
  lines.push(`  ${bold(config.name)}${dim(version)}`);
  if (config.description) {
    lines.push(`  ${config.description}`);
  }
  lines.push('');

  // Usage
  lines.push(yellow('USAGE'));
  if (hasCommands(config)) {
    lines.push(`  $ ${config.name} <command> [options]`);
  } else {
    lines.push(`  $ ${config.name} [options]`);
  }
  lines.push('');

  // Commands
  if (hasCommands(config)) {
    lines.push(yellow('COMMANDS'));
    for (const [name, cmd] of Object.entries(config.commands)) {
      const padding = Math.max(0, 14 - name.length);
      lines.push(`  ${bold(name)}${' '.repeat(padding)}${cmd.description}`);
    }
    lines.push('');
  }

  // Options
  if (config.options && Object.keys(config.options).length > 0) {
    // Group options
    const groups = new Map<string, Array<{ name: string; def: OptionDef }>>();
    const ungrouped: Array<{ name: string; def: OptionDef }> = [];

    for (const [name, def] of Object.entries(config.options)) {
      if (def.hidden) continue;

      if (def.group) {
        const group = groups.get(def.group) ?? [];
        group.push({ name, def });
        groups.set(def.group, group);
      } else {
        ungrouped.push({ name, def });
      }
    }

    // Print grouped options
    for (const [groupName, options] of groups) {
      lines.push(yellow(groupName.toUpperCase()));
      for (const opt of options) {
        lines.push(formatOptionHelp(opt.name, opt.def));
      }
      lines.push('');
    }

    // Print ungrouped
    if (ungrouped.length > 0) {
      const label = hasCommands(config) ? 'GLOBAL OPTIONS' : 'OPTIONS';
      lines.push(yellow(label));
      for (const opt of ungrouped) {
        lines.push(formatOptionHelp(opt.name, opt.def));
      }
      lines.push('');
    }
  }

  // Footer
  if (hasCommands(config)) {
    lines.push(dim(`Run '${config.name} <command> --help' for command-specific help.`));
    lines.push('');
  }

  return lines.join('\n');
};

/**
 * Generate help text for a specific command.
 */
export const generateCommandHelp = <
  TOptions extends OptionsSchema = OptionsSchema,
  TCommands extends Record<string, AnyCommandConfig> = Record<string, AnyCommandConfig>,
>(
  config: BargsConfigWithCommands<TOptions, [], TCommands>,
  commandName: string,
): string => {
  const command = config.commands[commandName];
  if (!command) {
    return `Unknown command: ${commandName}`;
  }

  const lines: string[] = [];

  // Header
  lines.push('');
  lines.push(`  ${bold(config.name)} ${bold(commandName)}`);
  lines.push(`  ${command.description}`);
  lines.push('');

  // Usage
  lines.push(yellow('USAGE'));
  lines.push(`  $ ${config.name} ${commandName} [options]`);
  lines.push('');

  // Command options
  if (command.options && Object.keys(command.options).length > 0) {
    lines.push(yellow('OPTIONS'));
    for (const [name, def] of Object.entries(command.options as OptionsSchema)) {
      if (def.hidden) continue;
      lines.push(formatOptionHelp(name, def));
    }
    lines.push('');
  }

  // Global options
  if (config.options && Object.keys(config.options).length > 0) {
    lines.push(yellow('GLOBAL OPTIONS'));
    for (const [name, def] of Object.entries(config.options)) {
      if (def.hidden) continue;
      lines.push(formatOptionHelp(name, def));
    }
    lines.push('');
  }

  return lines.join('\n');
};
