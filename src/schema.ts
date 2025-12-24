import { z, type ZodObject, type ZodRawShape, type ZodTypeAny } from 'zod';
import type { Aliases } from './types.js';

/**
 * Metadata extracted from a Zod schema via .meta().
 */
export interface SchemaMetadata {
  description?: string;
  group?: string;
  examples?: unknown[];
}

/**
 * parseArgs option config.
 */
export interface ParseArgsOptionConfig {
  type: 'string' | 'boolean';
  multiple?: boolean;
  short?: string;
  default?: unknown;
}

/**
 * Get the schema type name from Zod v4's introspection API.
 */
const getSchemaType = (schema: ZodTypeAny): string => {
  // Zod v4 uses _zod.def.type for introspection
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
 * Get the base type of a Zod schema, unwrapping optionals, defaults, etc.
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
 * Get the parseArgs type for a Zod schema.
 */
const getParseArgsType = (schema: ZodTypeAny): 'string' | 'boolean' => {
  const base = unwrapSchema(schema);
  const type = getSchemaType(base);

  if (type === 'boolean') {
    return 'boolean';
  }
  // Everything else is a string (numbers, enums, etc. come in as strings)
  return 'string';
};

/**
 * Check if schema represents an array/multiple value.
 */
const isArraySchema = (schema: ZodTypeAny): boolean => {
  const base = unwrapSchema(schema);
  return getSchemaType(base) === 'array';
};

/**
 * Get the element schema from an array schema.
 */
const getArrayElement = (schema: ZodTypeAny): ZodTypeAny => {
  const def = (schema as unknown as { _zod: { def: { element: ZodTypeAny } } })._zod.def;
  return def.element;
};

/**
 * Get the default value from a schema if it has one.
 */
const getDefaultValue = (schema: ZodTypeAny): unknown => {
  const type = getSchemaType(schema);

  if (type === 'default') {
    const def = (schema as unknown as { _zod: { def: { defaultValue: unknown } } })._zod.def;
    const defaultVal = def.defaultValue;
    // Can be a function or a value
    return typeof defaultVal === 'function' ? defaultVal() : defaultVal;
  }

  if (type === 'optional' || type === 'nullable') {
    return getDefaultValue(getInnerSchema(schema));
  }

  return undefined;
};

/**
 * Extract metadata from a Zod schema's global registry.
 */
export const getSchemaMetadata = (schema: ZodTypeAny): SchemaMetadata => {
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
      type: getParseArgsType(fieldSchema as ZodTypeAny),
    };

    if (isArraySchema(fieldSchema as ZodTypeAny)) {
      optionConfig.multiple = true;
      // For arrays, get the element type
      const base = unwrapSchema(fieldSchema as ZodTypeAny);
      optionConfig.type = getParseArgsType(getArrayElement(base));
    }

    // Only include defaults that match parseArgs expectations:
    // - boolean defaults for boolean type
    // - string defaults for string type
    // Zod will handle other defaults (like numbers) during validation
    const defaultValue = getDefaultValue(fieldSchema as ZodTypeAny);
    if (defaultValue !== undefined) {
      const isValidDefault =
        (optionConfig.type === 'boolean' && typeof defaultValue === 'boolean') ||
        (optionConfig.type === 'string' && typeof defaultValue === 'string');
      if (isValidDefault) {
        optionConfig.default = defaultValue;
      }
    }

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
