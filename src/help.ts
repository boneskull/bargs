/**
 * Help text generation for CLI applications.
 *
 * Generates formatted, colorized help output for both simple CLIs and
 * command-based CLIs. Supports customizable themes, automatic URL linkification
 * in terminals that support hyperlinks, option grouping, and automatic epilog
 * generation from `package.json` metadata.
 *
 * @packageDocumentation
 */

import type {
  BargsConfig,
  BargsConfigWithCommands,
  CommandConfigInput,
  OptionDef,
  OptionsSchema,
  PositionalDef,
  PositionalsSchema,
} from './types.js';

import { link, supportsHyperlinks } from './osc.js';
import {
  createStyler,
  defaultTheme,
  type Styler,
  type Theme,
} from './theme.js';
import { readPackageInfoSync } from './version.js';

/**
 * URL regex pattern for matching URLs in text.
 */
const URL_PATTERN = /https?:\/\/[^\s<>"\])}]+/g;

/**
 * Linkify URLs in text if terminal supports hyperlinks. Applies URL styling.
 */
const linkifyText = (
  text: string,
  styler: Styler,
  stream: NodeJS.WriteStream = process.stdout,
): string => {
  const canLink = supportsHyperlinks(stream);

  return text.replace(URL_PATTERN, (url) => {
    const styledUrl = styler.url(url);
    return canLink ? link(styledUrl, url) : styledUrl;
  });
};

/**
 * Generate default epilog from package.json (homepage and repository).
 */
const generateDefaultEpilog = (styler: Styler): string[] => {
  const pkgInfo = readPackageInfoSync();
  const lines: string[] = [];

  if (pkgInfo.homepage) {
    const styledUrl = styler.url(pkgInfo.homepage);
    const linkedUrl = supportsHyperlinks()
      ? link(styledUrl, pkgInfo.homepage)
      : styledUrl;
    lines.push(styler.epilog(`Homepage: ${linkedUrl}`));
  }

  if (pkgInfo.repository) {
    const styledUrl = styler.url(pkgInfo.repository);
    const linkedUrl = supportsHyperlinks()
      ? link(styledUrl, pkgInfo.repository)
      : styledUrl;
    lines.push(styler.epilog(`Repository: ${linkedUrl}`));
  }

  return lines;
};

/**
 * Format epilog based on config. Returns empty array if epilog is disabled,
 * custom epilog lines if provided, or default epilog from package.json.
 */
const formatEpilog = (
  config: { epilog?: false | string },
  styler: Styler,
): string[] => {
  // Explicitly disabled
  if (config.epilog === false || config.epilog === '') {
    return [];
  }

  // Custom epilog provided
  if (typeof config.epilog === 'string') {
    const linkified = linkifyText(config.epilog, styler);
    return [styler.epilog(linkified)];
  }

  // Default: generate from package.json
  return generateDefaultEpilog(styler);
};

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
const formatOptionHelp = (
  name: string,
  def: OptionDef,
  styler: Styler,
): string => {
  const parts: string[] = [];

  // Build flag string: -v, --verbose
  const shortAlias = def.aliases?.find((a) => a.length === 1);
  const flagText = shortAlias ? `-${shortAlias}, --${name}` : `    --${name}`;
  parts.push(`  ${styler.flag(flagText)}`);

  // Pad to align descriptions
  const padding = Math.max(0, 24 - flagText.length - 2);
  parts.push(' '.repeat(padding));

  // Description
  if (def.description) {
    parts.push(styler.description(def.description));
  }

  // Type and default
  const typeLabel = getTypeLabel(def);
  const suffixParts = [styler.type(`[${typeLabel}]`)];
  if ('default' in def && def.default !== undefined) {
    suffixParts.push(
      `${styler.defaultText('default:')} ${styler.defaultValue(JSON.stringify(def.default))}`,
    );
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
  theme: Theme = defaultTheme,
): string => {
  const styler = createStyler(theme);
  const lines: string[] = [];

  // Header
  const version = config.version ? ` v${config.version}` : '';
  lines.push('');
  lines.push(
    `${styler.scriptName(config.name)}${styler.defaultValue(version)}`,
  );
  if (config.description) {
    const linkifiedDesc = linkifyText(config.description, styler);
    lines.push(`  ${styler.description(linkifiedDesc)}`);
  }
  lines.push('');

  // Build positional names for usage line
  const posNames: string[] = [];
  if (config.positionals && config.positionals.length > 0) {
    for (let i = 0; i < config.positionals.length; i++) {
      const pos = config.positionals[i]!;
      const formatted = formatPositionalUsage(pos, i);
      posNames.push(styler.positional(formatted));
    }
  }

  // Usage
  lines.push(styler.sectionHeader('USAGE'));
  if (hasCommands(config)) {
    const posStr = posNames.length > 0 ? ` ${posNames.join(' ')}` : '';
    lines.push(styler.usage(`  $ ${config.name} <command> [options]${posStr}`));
  } else {
    const posStr = posNames.length > 0 ? ` ${posNames.join(' ')}` : '';
    lines.push(styler.usage(`  $ ${config.name} [options]${posStr}`));
  }
  lines.push('');

  // Commands
  if (hasCommands(config)) {
    lines.push(styler.sectionHeader('COMMANDS'));
    for (const [name, cmd] of Object.entries(config.commands)) {
      const padding = Math.max(0, 14 - name.length);
      lines.push(
        `  ${styler.command(name)}${' '.repeat(padding)}${styler.description(cmd.description)}`,
      );
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
      lines.push(styler.sectionHeader(groupName.toUpperCase()));
      for (const opt of options) {
        lines.push(formatOptionHelp(opt.name, opt.def, styler));
      }
      lines.push('');
    }

    // Print ungrouped
    if (ungrouped.length > 0) {
      const label = hasCommands(config) ? 'GLOBAL OPTIONS' : 'OPTIONS';
      lines.push(styler.sectionHeader(label));
      for (const opt of ungrouped) {
        lines.push(formatOptionHelp(opt.name, opt.def, styler));
      }
      lines.push('');
    }
  }

  // Positionals
  if (config.positionals && config.positionals.length > 0) {
    lines.push(styler.sectionHeader('POSITIONALS'));
    for (let i = 0; i < config.positionals.length; i++) {
      const pos = config.positionals[i]!;
      const name = pos.name ?? `arg${i}`;
      const formatted = pos.required ? `<${name}>` : `[${name}]`;
      const padding = Math.max(0, 20 - formatted.length);
      const desc = pos.description ?? '';
      lines.push(
        `  ${styler.positional(formatted)}${' '.repeat(padding)}${styler.description(desc)}`,
      );
    }
    lines.push('');
  }

  // Footer
  if (hasCommands(config)) {
    lines.push(
      styler.example(
        `Run '${config.name} <command> --help' for command-specific help.`,
      ),
    );
    lines.push('');
  }

  // Epilog
  const epilogLines = formatEpilog(config, styler);
  if (epilogLines.length > 0) {
    lines.push(...epilogLines);
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
  theme: Theme = defaultTheme,
): string => {
  const styler = createStyler(theme);
  const commandsRecord = config.commands as Record<string, CommandConfigInput>;
  const command = commandsRecord[commandName];
  if (!command) {
    return `Unknown command: ${commandName}`;
  }

  const lines: string[] = [];

  // Header
  lines.push('');
  lines.push(
    `  ${styler.scriptName(config.name)} ${styler.command(commandName)}`,
  );
  const linkifiedDesc = linkifyText(command.description, styler);
  lines.push(`  ${styler.description(linkifiedDesc)}`);
  lines.push('');

  // Usage
  lines.push(styler.sectionHeader('USAGE'));
  const positionalsPart = buildPositionalsUsage(command.positionals);
  const usageParts = [
    `$ ${config.name} ${commandName}`,
    '[options]',
    positionalsPart,
  ]
    .filter(Boolean)
    .join(' ');
  lines.push(styler.usage(`  ${usageParts}`));
  lines.push('');

  // Command options
  if (command.options && Object.keys(command.options).length > 0) {
    lines.push(styler.sectionHeader('OPTIONS'));
    for (const [name, def] of Object.entries(command.options)) {
      if (def.hidden) {
        continue;
      }
      lines.push(formatOptionHelp(name, def, styler));
    }
    lines.push('');
  }

  // Global options
  if (config.options && Object.keys(config.options).length > 0) {
    lines.push(styler.sectionHeader('GLOBAL OPTIONS'));
    for (const [name, def] of Object.entries(config.options)) {
      if (def.hidden) {
        continue;
      }
      lines.push(formatOptionHelp(name, def, styler));
    }
    lines.push('');
  }

  // Epilog
  const epilogLines = formatEpilog(config, styler);
  if (epilogLines.length > 0) {
    lines.push(...epilogLines);
    lines.push('');
  }

  return lines.join('\n');
};
