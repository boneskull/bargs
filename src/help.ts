import { z, type ZodTypeAny, type ZodObject, type ZodRawShape } from 'zod';
import { bold, cyan, dim, yellow } from './ansi.js';
import { getSchemaMetadata } from './schema.js';
import type { Aliases, SimpleBargsConfig, CommandBargsConfig, BargsConfig } from './types.js';

/**
 * Get the schema type name from Zod v4's introspection API.
 */
const getSchemaType = (schema: ZodTypeAny): string => {
  return (schema as unknown as { _zod: { def: { type: string } } })._zod.def.type;
};

/**
 * Get the inner schema from wrapper types.
 */
const getInnerSchema = (schema: ZodTypeAny): ZodTypeAny => {
  const def = (schema as unknown as { _zod: { def: Record<string, unknown> } })._zod.def;
  return (def.innerType ?? def.schema ?? def.wrapped) as ZodTypeAny;
};

/**
 * Unwrap schema to get base type.
 */
const unwrapSchema = (schema: ZodTypeAny): ZodTypeAny => {
  const type = getSchemaType(schema);

  switch (type) {
    case 'optional':
    case 'nullable':
    case 'default':
    case 'pipe':
      return unwrapSchema(getInnerSchema(schema));
    default:
      return schema;
  }
};

/**
 * Get type label for help display.
 */
const getTypeLabel = (schema: ZodTypeAny): string => {
  const base = unwrapSchema(schema);
  const type = getSchemaType(base);

  switch (type) {
    case 'boolean':
      return 'boolean';
    case 'number':
      return 'number';
    case 'array': {
      const def = (base as unknown as { _zod: { def: { element: ZodTypeAny } } })._zod.def;
      return `${getTypeLabel(def.element)}[]`;
    }
    case 'enum': {
      const def = (base as unknown as { _zod: { def: { entries: string[] } } })._zod.def;
      return def.entries.join(' | ');
    }
    default:
      return 'string';
  }
};

/**
 * Get default value if present.
 */
const getDefaultValue = (schema: ZodTypeAny): unknown => {
  const type = getSchemaType(schema);

  if (type === 'default') {
    const def = (schema as unknown as { _zod: { def: { defaultValue: unknown } } })._zod.def;
    const defaultVal = def.defaultValue;
    return typeof defaultVal === 'function' ? defaultVal() : defaultVal;
  }

  if (type === 'optional' || type === 'nullable') {
    return getDefaultValue(getInnerSchema(schema));
  }

  return undefined;
};

/**
 * Format a single option for help output.
 */
export const formatOptionHelp = <T extends ZodRawShape>(
  name: string,
  schema: ZodTypeAny,
  aliases: Aliases<T>,
): string => {
  const meta = getSchemaMetadata(schema);
  const typeLabel = getTypeLabel(schema);
  const defaultValue = getDefaultValue(schema);

  // Build flag string: -v, --verbose
  const optionAliases = aliases[name as keyof T] ?? [];
  const shortAlias = optionAliases.find((a) => a.length === 1);
  const flagParts: string[] = [];
  if (shortAlias) {
    flagParts.push(`-${shortAlias}`);
  }
  flagParts.push(`--${name}`);
  const flagStr = flagParts.join(', ');

  // Build parts
  const parts: string[] = [`  ${bold(flagStr)}`];

  // Pad to align descriptions
  const padding = Math.max(0, 24 - flagStr.length - 2);
  parts.push(' '.repeat(padding));

  if (meta.description) {
    parts.push(meta.description);
  }

  // Type and default
  const suffixParts: string[] = [];
  suffixParts.push(cyan(`[${typeLabel}]`));
  if (defaultValue !== undefined) {
    suffixParts.push(dim(`default: ${JSON.stringify(defaultValue)}`));
  }

  if (suffixParts.length > 0) {
    parts.push('  ');
    parts.push(suffixParts.join(' '));
  }

  return parts.join('');
};

/**
 * Check if config has commands.
 */
const hasCommands = (config: BargsConfig): config is CommandBargsConfig => {
  return 'commands' in config && config.commands !== undefined;
};

/**
 * Generate help text for a bargs config.
 */
export const generateHelp = (config: BargsConfig): string => {
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
  const optionsSchema = hasCommands(config) ? config.globalOptions : (config as SimpleBargsConfig).options;
  const aliases = hasCommands(config) ? (config.globalAliases ?? {}) : ((config as SimpleBargsConfig).aliases ?? {});

  if (optionsSchema) {
    const shape = optionsSchema.shape;

    // Group options by group metadata
    const groups = new Map<string, Array<{ name: string; schema: ZodTypeAny }>>();
    const ungrouped: Array<{ name: string; schema: ZodTypeAny }> = [];

    for (const [name, fieldSchema] of Object.entries(shape)) {
      const meta = getSchemaMetadata(fieldSchema as ZodTypeAny);
      if (meta.group) {
        const group = groups.get(meta.group) ?? [];
        group.push({ name, schema: fieldSchema as ZodTypeAny });
        groups.set(meta.group, group);
      } else {
        ungrouped.push({ name, schema: fieldSchema as ZodTypeAny });
      }
    }

    // Print grouped options
    for (const [groupName, options] of groups) {
      lines.push(yellow(groupName.toUpperCase()));
      for (const opt of options) {
        lines.push(formatOptionHelp(opt.name, opt.schema, aliases as Aliases<ZodRawShape>));
      }
      lines.push('');
    }

    // Print ungrouped options
    if (ungrouped.length > 0) {
      const label = hasCommands(config) ? 'GLOBAL OPTIONS' : 'OPTIONS';
      lines.push(yellow(label));
      for (const opt of ungrouped) {
        lines.push(formatOptionHelp(opt.name, opt.schema, aliases as Aliases<ZodRawShape>));
      }
      lines.push('');
    }
  }

  // Footer for commands
  if (hasCommands(config)) {
    lines.push(dim(`Run '${config.name} <command> --help' for command-specific help.`));
    lines.push('');
  }

  return lines.join('\n');
};

/**
 * Generate help text for a specific command.
 */
export const generateCommandHelp = (
  config: CommandBargsConfig,
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
  if (command.options) {
    lines.push(yellow('OPTIONS'));
    const shape = command.options.shape;
    const aliases = command.aliases ?? {};
    for (const [name, fieldSchema] of Object.entries(shape)) {
      lines.push(formatOptionHelp(name, fieldSchema as ZodTypeAny, aliases as Aliases<ZodRawShape>));
    }
    lines.push('');
  }

  // Global options
  if (config.globalOptions) {
    lines.push(yellow('GLOBAL OPTIONS'));
    const shape = config.globalOptions.shape;
    const aliases = config.globalAliases ?? {};
    for (const [name, fieldSchema] of Object.entries(shape)) {
      lines.push(formatOptionHelp(name, fieldSchema as ZodTypeAny, aliases as Aliases<ZodRawShape>));
    }
    lines.push('');
  }

  return lines.join('\n');
};
