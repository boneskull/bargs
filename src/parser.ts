import { parseArgs } from 'node:util';
import { z, type ZodObject, type ZodRawShape, type ZodTypeAny, type ZodTuple, type ZodArray } from 'zod';
import { extractParseArgsConfig } from './schema.js';
import type { Aliases } from './types.js';

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
  // 'pipe' uses 'in' for the input schema (from .transform())
  return (def.in ?? def.innerType ?? def.schema ?? def.wrapped) as ZodTypeAny;
};

/**
 * Options for parseSimple.
 */
export interface ParseSimpleOptions<
  TOptions extends ZodObject<ZodRawShape> | z.ZodEffects<ZodObject<ZodRawShape>>,
  TPositionals extends ZodTuple | ZodArray<ZodTypeAny> | undefined = undefined,
> {
  options: TOptions;
  positionals?: TPositionals;
  aliases?: TOptions extends ZodObject<infer S>
    ? Aliases<S>
    : TOptions extends z.ZodEffects<ZodObject<infer S>>
      ? Aliases<S>
      : never;
  defaults?: Record<string, unknown>;
  args?: string[];
}

/**
 * Get the inner ZodObject from a schema (unwrapping ZodEffects).
 */
const getInnerObject = (
  schema: ZodObject<ZodRawShape> | z.ZodEffects<ZodObject<ZodRawShape>>,
): ZodObject<ZodRawShape> => {
  const type = getSchemaType(schema);
  if (type === 'pipe') {
    return getInnerObject(getInnerSchema(schema) as ZodObject<ZodRawShape>);
  }
  return schema as ZodObject<ZodRawShape>;
};

/**
 * Coerce string values to their expected types based on schema.
 */
const coerceValues = (
  values: Record<string, unknown>,
  schema: ZodObject<ZodRawShape>,
): Record<string, unknown> => {
  const shape = schema.shape;
  const result: Record<string, unknown> = { ...values };

  for (const [key, value] of Object.entries(values)) {
    const fieldSchema = shape[key];
    if (!fieldSchema) continue;

    // Unwrap to get base type
    let base: ZodTypeAny = fieldSchema;
    let schemaType = getSchemaType(base);
    while (schemaType === 'optional' || schemaType === 'nullable' || schemaType === 'default') {
      base = getInnerSchema(base);
      schemaType = getSchemaType(base);
    }

    // Coerce numbers
    if (schemaType === 'number' && typeof value === 'string') {
      result[key] = Number(value);
    }

    // Handle arrays of numbers
    if (schemaType === 'array') {
      const elementDef = (base as unknown as { _zod: { def: { element: ZodTypeAny } } })._zod.def;
      if (getSchemaType(elementDef.element) === 'number' && Array.isArray(value)) {
        result[key] = value.map((v) => (typeof v === 'string' ? Number(v) : v));
      }
    }
  }

  return result;
};

/**
 * Parse arguments for a simple CLI (no commands).
 */
export const parseSimple = async <
  TOptions extends ZodObject<ZodRawShape> | z.ZodEffects<ZodObject<ZodRawShape>>,
  TPositionals extends ZodTuple | ZodArray<ZodTypeAny> | undefined = undefined,
>(
  options: ParseSimpleOptions<TOptions, TPositionals>,
): Promise<
  z.infer<TOptions> & (TPositionals extends ZodTypeAny ? { positionals: z.infer<TPositionals> } : object)
> => {
  const { options: schema, positionals: positionalsSchema, aliases = {}, defaults = {}, args = process.argv.slice(2) } = options;

  // Get inner object schema for parseArgs config
  const innerSchema = getInnerObject(schema);
  const parseArgsOptions = extractParseArgsConfig(innerSchema, aliases as Aliases<ZodRawShape>);

  // Call util.parseArgs
  const { values, positionals } = parseArgs({
    args,
    options: parseArgsOptions,
    strict: true,
    allowPositionals: positionalsSchema !== undefined,
  });

  // Merge: defaults -> parseArgs values (CLI wins)
  const merged = { ...defaults, ...values };

  // Coerce string values to expected types
  const coerced = coerceValues(merged, innerSchema);

  // Validate with Zod (including transforms)
  const validated = await schema.parseAsync(coerced);

  // Add positionals if schema provided
  if (positionalsSchema) {
    const validatedPositionals = await positionalsSchema.parseAsync(positionals);
    return { ...validated, positionals: validatedPositionals } as z.infer<TOptions> &
      (TPositionals extends ZodTypeAny ? { positionals: z.infer<TPositionals> } : object);
  }

  return validated as z.infer<TOptions> &
    (TPositionals extends ZodTypeAny ? { positionals: z.infer<TPositionals> } : object);
};
