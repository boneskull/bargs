// src/parser-new.ts
import { parseArgs } from 'node:util';

import type {
  BargsResult,
  InferOptions,
  InferPositionals,
  OptionDef,
  OptionsSchema,
  PositionalDef,
  PositionalsSchema,
} from './types-new.js';

/**
 * Build parseArgs options config from our options schema.
 */
const buildParseArgsConfig = (
  schema: OptionsSchema,
): Record<string, { multiple?: boolean; short?: string; type: 'boolean' | 'string' }> => {
  const config: Record<
    string,
    { multiple?: boolean; short?: string; type: 'boolean' | 'string' }
  > = {};

  for (const [name, def] of Object.entries(schema)) {
    const opt: { multiple?: boolean; short?: string; type: 'boolean' | 'string' } = {
      type: def.type === 'boolean' ? 'boolean' : 'string',
    };

    // First single-char alias becomes short option
    const shortAlias = def.aliases?.find((a) => a.length === 1);
    if (shortAlias) {
      opt.short = shortAlias;
    }

    // Arrays need multiple: true
    if (def.type === 'array') {
      opt.multiple = true;
    }

    config[name] = opt;
  }

  return config;
};

/**
 * Coerce parsed values to their expected types.
 */
const coerceValues = (
  values: Record<string, unknown>,
  schema: OptionsSchema,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};

  for (const [name, def] of Object.entries(schema)) {
    let value = values[name];

    // Apply default if undefined
    if (value === undefined && 'default' in def) {
      value = def.default;
    }

    // Type coercion
    if (value !== undefined) {
      switch (def.type) {
        case 'number':
          result[name] = typeof value === 'string' ? Number(value) : value;
          break;
        case 'array':
          if (def.items === 'number' && Array.isArray(value)) {
            result[name] = value.map((v) => (typeof v === 'string' ? Number(v) : v));
          } else {
            result[name] = value;
          }
          break;
        case 'count':
          // Count options count occurrences
          result[name] = typeof value === 'number' ? value : value ? 1 : 0;
          break;
        case 'enum':
          if (value !== undefined && !def.choices.includes(value as string)) {
            throw new Error(
              `Invalid value for --${name}: "${value}". Must be one of: ${def.choices.join(', ')}`,
            );
          }
          result[name] = value;
          break;
        default:
          result[name] = value;
      }
    } else {
      result[name] = value;
    }
  }

  return result;
};

/**
 * Coerce positional values.
 */
const coercePositionals = (
  positionals: string[],
  schema: PositionalsSchema,
): unknown[] => {
  const result: unknown[] = [];

  for (let i = 0; i < schema.length; i++) {
    const def = schema[i];
    const value = positionals[i];

    if (def.type === 'variadic') {
      // Rest of positionals
      const rest = positionals.slice(i);
      if (def.items === 'number') {
        result.push(rest.map(Number));
      } else {
        result.push(rest);
      }
      break;
    }

    if (value !== undefined) {
      if (def.type === 'number') {
        result.push(Number(value));
      } else {
        result.push(value);
      }
    } else if ('default' in def && def.default !== undefined) {
      result.push(def.default);
    } else if (def.required) {
      throw new Error(`Missing required positional argument at position ${i}`);
    } else {
      result.push(undefined);
    }
  }

  return result;
};

/**
 * Options for parseSimple.
 */
interface ParseSimpleOptions<
  TOptions extends OptionsSchema = OptionsSchema,
  TPositionals extends PositionalsSchema = PositionalsSchema,
> {
  options?: TOptions;
  positionals?: TPositionals;
  args?: string[];
}

/**
 * Parse arguments for a simple CLI (no commands).
 */
export const parseSimple = async <
  TOptions extends OptionsSchema = OptionsSchema,
  TPositionals extends PositionalsSchema = PositionalsSchema,
>(
  config: ParseSimpleOptions<TOptions, TPositionals>,
): Promise<
  BargsResult<InferOptions<TOptions>, InferPositionals<TPositionals>, undefined>
> => {
  const {
    options: optionsSchema = {} as TOptions,
    positionals: positionalsSchema = [] as unknown as TPositionals,
    args = process.argv.slice(2),
  } = config;

  // Build parseArgs config
  const parseArgsOptions = buildParseArgsConfig(optionsSchema);

  // Parse with Node.js util.parseArgs
  const { positionals, values } = parseArgs({
    args,
    options: parseArgsOptions,
    strict: true,
    allowPositionals: positionalsSchema.length > 0,
  });

  // Coerce and apply defaults
  const coercedValues = coerceValues(values, optionsSchema);
  const coercedPositionals = coercePositionals(positionals, positionalsSchema);

  return {
    command: undefined,
    positionals: coercedPositionals as InferPositionals<TPositionals>,
    values: coercedValues as InferOptions<TOptions>,
  };
};

// Export types and helpers that will be needed by other modules
export { buildParseArgsConfig, coercePositionals, coerceValues };
export type { ParseSimpleOptions };
