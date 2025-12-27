import type { ZodArray, ZodRawShape, ZodTuple, ZodType } from 'zod';

import type {
  Aliases,
  AnyCommandConfig,
  BargsConfig,
  BargsConfigWithCommands,
} from './types.js';

import { bold, cyan, dim, yellow } from './ansi.js';
import { getSchemaMetadata } from './schema.js';
import { hasCommands } from './util.js';
import {
  getArrayElement,
  getDefaultValue,
  getDefType,
  getEnumEntries,
  getInnerObject,
  unwrapToBase,
} from './zod-introspection.js';

/**
 * Get type label for help display.
 */
const getTypeLabel = (schema: ZodType): string => {
  const base = unwrapToBase(schema);
  const type = getDefType(base);

  switch (type) {
    case 'array': {
      return `${getTypeLabel(getArrayElement(base))}[]`;
    }
    case 'boolean':
      return 'boolean';
    case 'enum': {
      return getEnumEntries(base).join(' | ');
    }
    case 'number':
      return 'number';
    default:
      return 'string';
  }
};

/**
 * Internal type for aliases used in help formatting.
 */
type AliasMap = Record<string, string[] | undefined>;

/**
 * Format a single option for help output.
 */
export const formatOptionHelp = <T extends ZodRawShape>(
  name: string,
  schema: ZodType,
  aliases: Aliases<T>,
): string => {
  const meta = getSchemaMetadata(schema);
  const typeLabel = getTypeLabel(schema);
  const defaultValue = getDefaultValue(schema);

  // Build flag string: -v, --verbose
  const optionAliases = (aliases as AliasMap)[name] ?? [];
  const shortAlias = optionAliases.find((a) => a.length === 1);
  const flagStr = shortAlias ? `-${shortAlias}, --${name}` : `--${name}`;

  // Build parts
  const parts: string[] = [`  ${bold(flagStr)}`];

  // Pad to align descriptions
  const padding = Math.max(0, 24 - flagStr.length - 2);
  parts.push(' '.repeat(padding));

  if (meta.description) {
    parts.push(meta.description);
  }

  // Type and default
  const suffixParts = [cyan(`[${typeLabel}]`)];
  if (defaultValue !== undefined) {
    suffixParts.push(dim(`default: ${JSON.stringify(defaultValue)}`));
  }

  parts.push('  ', suffixParts.join(' '));

  return parts.join('');
};

/**
 * Render options section for help output.
 */
const renderOptionsSection = (
  lines: string[],
  label: string,
  shape: Record<string, ZodType>,
  aliases: AliasMap,
): void => {
  lines.push(yellow(label));
  for (const [name, fieldSchema] of Object.entries(shape)) {
    lines.push(formatOptionHelp(name, fieldSchema, aliases as Aliases<ZodRawShape>));
  }
  lines.push('');
};

/**
 * Generate help text for a bargs config.
 */
export const generateHelp = <
  TOptions extends ZodType,
  TPositionals extends undefined | ZodArray | ZodTuple = undefined,
  TCommands extends Record<string, AnyCommandConfig> | undefined = undefined,
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
    lines.push(`  $ ${config.name} [options]`);
  }
  lines.push('');

  // Commands (if any)
  if (hasCommands(config)) {
    lines.push(yellow('COMMANDS'));
    for (const [name, cmd] of Object.entries(config.commands)) {
      const padding = Math.max(0, 14 - name.length);
      lines.push(`  ${bold(name)}${' '.repeat(padding)}${cmd.description}`);
    }
    lines.push('');
  }

  // Options
  const optionsSchema = config.options;
  const aliases = config.aliases ?? {};

  if (optionsSchema) {
    const innerObj = getInnerObject(optionsSchema);
    if (!innerObj) {
      return lines.join('\n');
    }
    const shape = innerObj.shape;

    // Group options by group metadata
    const groups = new Map<string, Array<{ name: string; schema: ZodType }>>();
    const ungrouped: Array<{ name: string; schema: ZodType }> = [];

    for (const [name, fieldSchema] of Object.entries(shape)) {
      const meta = getSchemaMetadata(fieldSchema);
      if (meta.group) {
        const group = groups.get(meta.group) ?? [];
        group.push({ name, schema: fieldSchema });
        groups.set(meta.group, group);
      } else {
        ungrouped.push({ name, schema: fieldSchema });
      }
    }

    // Print grouped options
    for (const [groupName, options] of groups) {
      lines.push(yellow(groupName.toUpperCase()));
      for (const opt of options) {
        lines.push(
          formatOptionHelp(
            opt.name,
            opt.schema,
            aliases as Aliases<ZodRawShape>,
          ),
        );
      }
      lines.push('');
    }

    // Print ungrouped options
    if (ungrouped.length > 0) {
      const label = hasCommands(config) ? 'GLOBAL OPTIONS' : 'OPTIONS';
      lines.push(yellow(label));
      for (const opt of ungrouped) {
        lines.push(
          formatOptionHelp(
            opt.name,
            opt.schema,
            aliases as Aliases<ZodRawShape>,
          ),
        );
      }
      lines.push('');
    }
  }

  // Footer for commands
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
  TOptions extends ZodType,
  TPositionals extends undefined | ZodArray | ZodTuple = undefined,
  TCommands extends Record<string, AnyCommandConfig> = Record<
    string,
    AnyCommandConfig
  >,
>(
  config: BargsConfigWithCommands<TOptions, TPositionals, TCommands>,
  commandName: string,
): string => {
  const commandsRecord = config.commands as Record<string, AnyCommandConfig>;
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
  lines.push(`  $ ${config.name} ${commandName} [options]`);
  lines.push('');

  // Command options
  if (command.options) {
    const innerObj = getInnerObject(command.options);
    if (innerObj) {
      renderOptionsSection(lines, 'OPTIONS', innerObj.shape, command.aliases ?? {});
    }
  }

  // Global options (from config.options when commands are present)
  if (config.options) {
    const innerObj = getInnerObject(config.options);
    if (innerObj) {
      renderOptionsSection(lines, 'GLOBAL OPTIONS', innerObj.shape, config.aliases ?? {});
    }
  }

  return lines.join('\n');
};
