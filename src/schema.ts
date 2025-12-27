import { z, type ZodObject, type ZodRawShape, type ZodType } from 'zod';

import type { Aliases } from './types.js';

import {
  getArrayElement,
  getDefType,
  unwrapToBase,
} from './zod-introspection.js';

/**
 * ParseArgs option config. Note: We intentionally omit 'default' - schema
 * defaults are handled by Zod during validation to allow user-provided defaults
 * (e.g., from config files) to take precedence.
 */
interface ParseArgsOptionConfig {
  multiple?: boolean;
  short?: string;
  type: 'boolean' | 'string';
}

/**
 * Metadata extracted from a Zod schema via .meta().
 */
interface SchemaMetadata {
  description?: string;
  examples?: unknown[];
  group?: string;
}

/**
 * Get the parseArgs type for a Zod schema.
 */
const getParseArgsType = (schema: ZodType): 'boolean' | 'string' => {
  const base = unwrapToBase(schema);
  const type = getDefType(base);

  if (type === 'boolean') {
    return 'boolean';
  }
  // Everything else is a string (numbers, enums, etc. come in as strings)
  return 'string';
};

/**
 * Check if schema represents an array/multiple value.
 */
const isArraySchema = (schema: ZodType): boolean => {
  const base = unwrapToBase(schema);
  return getDefType(base) === 'array';
};

/**
 * Extract metadata from a Zod schema's global registry.
 */
export const getSchemaMetadata = (schema: ZodType): SchemaMetadata => {
  const meta = z.globalRegistry.get(schema);
  if (!meta || Object.keys(meta).length === 0) {
    return {};
  }
  const result: SchemaMetadata = {};
  if (meta.description) {
    result.description = meta.description;
  }
  if (meta.group) {
    result.group = meta.group as string;
  }
  if (meta.examples) {
    result.examples = meta.examples as unknown[];
  }
  return result;
};

/**
 * Extract util.parseArgs config from a Zod object schema.
 */
export const extractParseArgsConfig = <T extends ZodRawShape>(
  schema: ZodObject<T>,
  aliases: Aliases<T>,
): Record<string, ParseArgsOptionConfig> => {
  const shape = schema.shape;
  const config: Record<string, ParseArgsOptionConfig> = {};

  for (const [key, fieldSchema] of Object.entries(shape)) {
    const optionConfig: ParseArgsOptionConfig = {
      type: getParseArgsType(fieldSchema as ZodType),
    };

    if (isArraySchema(fieldSchema as ZodType)) {
      optionConfig.multiple = true;
      // For arrays, get the element type
      const base = unwrapToBase(fieldSchema as ZodType);
      optionConfig.type = getParseArgsType(getArrayElement(base));
    }

    // NOTE: We intentionally do NOT pass schema defaults to parseArgs.
    // This allows user-provided defaults (e.g., from config files) to take
    // precedence over schema defaults. Zod will apply schema defaults during
    // validation for any values not provided by CLI or user defaults.
    //
    // Precedence: CLI args > user defaults > schema defaults

    // Apply aliases - use first single-char alias as short
    const keyAliases = aliases[key as keyof T];
    if (keyAliases && keyAliases.length > 0) {
      const shortAlias = keyAliases.find((a) => a.length === 1);
      if (shortAlias) {
        optionConfig.short = shortAlias;
      }
    }

    config[key] = optionConfig;
  }

  return config;
};
