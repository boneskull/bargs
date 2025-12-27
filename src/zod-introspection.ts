/**
 * Type-safe Zod v4 schema introspection utilities.
 *
 * Zod v4 uses `_zod.def.type` as a discriminant for different schema kinds.
 * This module provides type-safe ways to inspect and unwrap schemas.
 */
import type { ZodType } from 'zod';

/**
 * Zod v4 internal def structure with type discriminant.
 */
interface ZodInternalDef {
  defaultValue?: unknown;
  element?: ZodType; // Used by array
  entries?: string[]; // Used by enum
  in?: ZodType; // Used by pipe
  innerType?: ZodType;
  shape?: Record<string, ZodType>;
  type: string;
}

/**
 * Get the internal def object from a Zod schema.
 */
const getDef = (schema: ZodType): ZodInternalDef =>
  (schema as unknown as { _zod: { def: ZodInternalDef } })._zod.def;

/**
 * Get the def.type of a Zod schema.
 */
export const getDefType = (schema: ZodType): string => getDef(schema).type;

/**
 * Schemas that wrap another schema and can be "unwrapped".
 */
const WRAPPER_TYPES = new Set(['default', 'nullable', 'optional', 'pipe']);

/**
 * Check if this schema type wraps an inner schema.
 */
export const isWrapperType = (type: string): boolean => {
  return WRAPPER_TYPES.has(type);
};

/**
 * Get the inner schema from a wrapper type.
 *
 * - Optional, nullable, default: use `innerType`
 * - Pipe (from .transform()): use `in`
 */
export const getInnerSchema = (schema: ZodType): ZodType => {
  const def = getDef(schema);
  return def.type === 'pipe' ? (def.in as ZodType) : (def.innerType as ZodType);
};

/**
 * Unwrap all wrapper types to get the base schema.
 *
 * Recursively unwraps: optional, nullable, default, pipe
 */
export const unwrapToBase = (schema: ZodType): ZodType => {
  const type = getDefType(schema);

  if (isWrapperType(type)) {
    return unwrapToBase(getInnerSchema(schema));
  }

  return schema;
};

/**
 * Get array element schema.
 */
export const getArrayElement = (schema: ZodType): ZodType =>
  getDef(schema).element as ZodType;

/**
 * Get enum entries (string values).
 */
export const getEnumEntries = (schema: ZodType): string[] =>
  getDef(schema).entries as string[];

/**
 * Get default value from a ZodDefault schema.
 *
 * Handles both static values and getter functions.
 */
export const getDefaultValue = (schema: ZodType): unknown => {
  const def = getDef(schema);

  if (def.type === 'default') {
    const val = def.defaultValue;
    return typeof val === 'function' ? (val as () => unknown)() : val;
  }

  if (def.type === 'optional' || def.type === 'nullable') {
    return getDefaultValue(getInnerSchema(schema));
  }

  return undefined;
};

/**
 * Get the inner ZodObject from a schema, unwrapping pipes/transforms.
 *
 * Returns undefined if no object schema is found.
 */
export const getInnerObject = (
  schema: ZodType,
): undefined | (ZodType & { shape: Record<string, ZodType> }) => {
  const type = getDefType(schema);

  if (type === 'object') {
    return schema as ZodType & { shape: Record<string, ZodType> };
  }

  if (type === 'pipe') {
    return getInnerObject(getInnerSchema(schema));
  }

  return undefined;
};
