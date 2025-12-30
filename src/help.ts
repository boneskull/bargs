// src/help.ts
import type {
  BargsConfig,
  BargsConfigWithCommands,
  CommandConfigInput,
  OptionDef,
  OptionsSchema,
  PositionalDef,
  PositionalsSchema,
} from './types.js';

import { bold, cyan, dim, yellow } from './ansi.js';

/**
 * Format a single positional for help usage line. Required positionals use
 * <name>, optional use [name]. Variadic positionals append "...".
 */
const formatPositionalUsage = (def: PositionalDef, index: number): string => {
  const name = def.name ?? `arg${index}`;
  const isRequired = def.required || 'default' in def;
  const isVariadic = def.type === 'variadic';
  const displayName = isVariadic ? `${name}...` : name;

  return isRequired ? `<${displayName}>` : `[${displayName}]`;
};

/**
 * Build the positionals usage string from a schema.
 */
const buildPositionalsUsage = (schema?: PositionalsSchema): string => {
  if (!schema || schema.length === 0) {
    return '';
  }

  return schema
    .map((def, index) => formatPositionalUsage(def, index))
    .join(' ');
};

/**
 * Get type label for help display.
 */
const getTypeLabel = (def: OptionDef): string => {
  switch (def.type) {
    case 'array':
      return `${def.items}[]`;
    case 'boolean':
      return 'boolean';
    case 'count':
      return 'count';
    case 'enum':
      return def.choices.join(' | ');
    case 'number':
      return 'number';
    case 'string':
      return 'string';
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
const hasCommands = <
  T extends { commands?: Record<string, CommandConfigInput> },
>(
  config: T,
): config is T & { commands: Record<string, CommandConfigInput> } =>
  config.commands !== undefined && Object.keys(config.commands).length > 0;

/**
 * Generate help text for a bargs config.
 */
export const generateHelp = <
  TOptions extends OptionsSchema = OptionsSchema,
  TPositionals extends PositionalsSchema = PositionalsSchema,
  TCommands extends Record<string, CommandConfigInput> | undefined = undefined,
>(
  config: BargsConfig<TOptions, TPositionals, TCommands>,
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
    const positionalsPart = buildPositionalsUsage(config.positionals);
    const usageParts = [`$ ${config.name}`, '[options]', positionalsPart]
      .filter(Boolean)
      .join(' ');
    lines.push(`  ${usageParts}`);
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
    const groups = new Map<string, Array<{ def: OptionDef; name: string }>>();
    const ungrouped: Array<{ def: OptionDef; name: string }> = [];

    for (const [name, def] of Object.entries(config.options)) {
      if (def.hidden) {
        continue;
      }

      if (def.group) {
        const group = groups.get(def.group) ?? [];
        group.push({ def, name });
        groups.set(def.group, group);
      } else {
        ungrouped.push({ def, name });
      }
    }

    // Print grouped options
    for (const [groupName, options] of Array.from(groups.entries())) {
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
    lines.push(
      dim(`Run '${config.name} <command> --help' for command-specific help.`),
    );
    lines.push('');
  }

  return lines.join('\n');
};

/**
 * Generate help text for a specific command.
 */
export const generateCommandHelp = <
  TOptions extends OptionsSchema = OptionsSchema,
  TCommands extends Record<string, CommandConfigInput> = Record<
    string,
    CommandConfigInput
  >,
>(
  config: BargsConfigWithCommands<TOptions, TCommands>,
  commandName: string,
): string => {
  const commandsRecord = config.commands as Record<string, CommandConfigInput>;
  const command = commandsRecord[commandName];
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
  const positionalsPart = buildPositionalsUsage(command.positionals);
  const usageParts = [
    `$ ${config.name} ${commandName}`,
    '[options]',
    positionalsPart,
  ]
    .filter(Boolean)
    .join(' ');
  lines.push(`  ${usageParts}`);
  lines.push('');

  // Command options
  if (command.options && Object.keys(command.options).length > 0) {
    lines.push(yellow('OPTIONS'));
    for (const [name, def] of Object.entries(command.options)) {
      if (def.hidden) {
        continue;
      }
      lines.push(formatOptionHelp(name, def));
    }
    lines.push('');
  }

  // Global options
  if (config.options && Object.keys(config.options).length > 0) {
    lines.push(yellow('GLOBAL OPTIONS'));
    for (const [name, def] of Object.entries(config.options)) {
      if (def.hidden) {
        continue;
      }
      lines.push(formatOptionHelp(name, def));
    }
    lines.push('');
  }

  return lines.join('\n');
};
