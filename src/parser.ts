/**
 * Low-level argument parsing logic wrapping Node.js `util.parseArgs()`.
 *
 * Handles the transformation of CLI arguments into typed values by:
 *
 * - Building `parseArgs` configuration from bargs option schemas
 * - Coercing parsed string values to their declared types (number, enum, etc.)
 * - Processing positional arguments including variadic rest args
 *
 * @packageDocumentation
 */

import { parseArgs } from 'node:util';

import type {
  InferOptions,
  InferPositionals,
  OptionsSchema,
  ParseResult,
  PositionalsSchema,
} from './types.js';

import { HelpError } from './errors.js';

/**
 * Build parseArgs options config from our options schema.
 *
 * For boolean options, also adds `no-<name>` variants to support explicit
 * negation (e.g., `--no-verbose` sets `verbose` to `false`).
 *
 * Multi-character aliases are registered as separate options with the same type
 * and multiple settings, then collapsed back to canonical names after parsing
 * via `collapseAliases()`.
 *
 * @function
 */
const buildParseArgsConfig = (
  schema: OptionsSchema,
): Record<
  string,
  { multiple?: boolean; short?: string; type: 'boolean' | 'string' }
> => {
  const config: Record<
    string,
    { multiple?: boolean; short?: string; type: 'boolean' | 'string' }
  > = {};

  for (const [name, def] of Object.entries(schema)) {
    const parseArgsType: 'boolean' | 'string' =
      def.type === 'boolean' ? 'boolean' : 'string';
    const isMultiple = def.type === 'array';

    const opt: {
      multiple?: boolean;
      short?: string;
      type: 'boolean' | 'string';
    } = {
      type: parseArgsType,
    };

    // First single-char alias becomes short option
    const shortAlias = def.aliases?.find((a) => a.length === 1);
    if (shortAlias) {
      opt.short = shortAlias;
    }

    // Arrays need multiple: true
    if (isMultiple) {
      opt.multiple = true;
    }

    config[name] = opt;

    // Register multi-character aliases as separate options
    for (const alias of def.aliases ?? []) {
      if (alias.length > 1) {
        const aliasOpt: {
          multiple?: boolean;
          type: 'boolean' | 'string';
        } = { type: parseArgsType };
        if (isMultiple) {
          aliasOpt.multiple = true;
        }
        config[alias] = aliasOpt;
      }
    }

    // For boolean options, add negated form (--no-<name>)
    // Note: We do NOT add --no-<alias> forms for aliases
    if (def.type === 'boolean') {
      config[`no-${name}`] = { type: 'boolean' };
    }
  }

  return config;
};

/**
 * Coerce parsed values to their expected types.
 *
 * @function
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
        case 'array': {
          const arrayDef = def as {
            choices?: readonly string[];
            items?: string;
          };
          if (arrayDef.choices && Array.isArray(value)) {
            // Enum array - validate each value
            for (const v of value as string[]) {
              if (!arrayDef.choices.includes(v)) {
                throw new Error(
                  `Invalid value for --${name}: "${v}". Must be one of: ${arrayDef.choices.join(', ')}`,
                );
              }
            }
            result[name] = value;
          } else if (arrayDef.items === 'number' && Array.isArray(value)) {
            result[name] = (value as (number | string)[]).map(
              (v: number | string) => (typeof v === 'string' ? Number(v) : v),
            );
          } else {
            result[name] = value;
          }
          break;
        }
        case 'count':
          // Count options count occurrences
          result[name] = typeof value === 'number' ? value : value ? 1 : 0;
          break;
        case 'enum': {
          const enumValue = value as string;
          if (value !== undefined && !def.choices.includes(enumValue)) {
            throw new Error(
              `Invalid value for --${name}: "${enumValue}". Must be one of: ${def.choices.join(', ')}`,
            );
          }
          result[name] = value;
          break;
        }
        case 'number':
          result[name] = typeof value === 'string' ? Number(value) : value;
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
 *
 * @function
 */
const coercePositionals = (
  positionals: string[],
  schema: PositionalsSchema,
): readonly unknown[] => {
  const result: unknown[] = [];

  for (let i = 0; i < schema.length; i++) {
    const def = schema[i]!;
    const value = positionals[i];

    if (def.type === 'variadic') {
      // Rest of positionals
      const variadicDef = def as { items: 'number' | 'string' };
      const rest = positionals.slice(i);
      if (variadicDef.items === 'number') {
        result.push(rest.map(Number));
      } else {
        result.push(rest);
      }
      break;
    }

    if (value !== undefined) {
      if (def.type === 'number') {
        result.push(Number(value));
      } else if (def.type === 'enum') {
        // Validate enum choice
        if (!def.choices.includes(value)) {
          throw new Error(
            `Invalid value for positional ${i}: "${value}". Must be one of: ${def.choices.join(', ')}`,
          );
        }
        result.push(value);
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
 * Process negated boolean options (--no-<name>).
 *
 * - If `--no-<name>` is true and `--<name>` is not set, sets `<name>` to false
 * - If both `--<name>` and `--no-<name>` are set, throws an error
 * - Removes all `no-<name>` keys from the result
 *
 * @function
 */
const processNegatedBooleans = (
  values: Record<string, unknown>,
  schema: OptionsSchema,
): Record<string, unknown> => {
  const result = { ...values };

  for (const [name, def] of Object.entries(schema)) {
    if (def.type !== 'boolean') {
      continue;
    }

    const negatedKey = `no-${name}`;
    const hasPositive = result[name] === true;
    const hasNegative = result[negatedKey] === true;

    if (hasPositive && hasNegative) {
      throw new HelpError(
        `Conflicting options: --${name} and --${negatedKey} cannot both be specified`,
      );
    }

    if (hasNegative && !hasPositive) {
      result[name] = false;
    }

    // Always remove the negated key from result
    delete result[negatedKey];
  }

  return result;
};

/**
 * Collapse multi-character aliases into their canonical option names.
 *
 * For array options, merges values from all aliases into the canonical name.
 * For non-array options, throws HelpError if both alias and canonical were
 * provided. Always removes alias keys from the result.
 *
 * @function
 */
const collapseAliases = (
  values: Record<string, unknown>,
  schema: OptionsSchema,
): Record<string, unknown> => {
  const result = { ...values };

  // Build alias-to-canonical mapping (only multi-char aliases)
  const aliasToCanonical = new Map<string, string>();
  for (const [name, def] of Object.entries(schema)) {
    for (const alias of def.aliases ?? []) {
      if (alias.length > 1) {
        aliasToCanonical.set(alias, name);
      }
    }
  }

  // Process each alias found in the values
  for (const [alias, canonical] of aliasToCanonical) {
    const aliasValue = result[alias];
    if (aliasValue === undefined) {
      continue;
    }

    const def = schema[canonical]!;
    const canonicalValue = result[canonical];
    const isArray = def.type === 'array';

    if (isArray) {
      // For arrays, merge values
      const existingArray = Array.isArray(canonicalValue) ? canonicalValue : [];
      const aliasArray = Array.isArray(aliasValue) ? aliasValue : [aliasValue];
      result[canonical] = [...existingArray, ...aliasArray];
    } else {
      // For non-arrays, check for conflict
      if (canonicalValue !== undefined) {
        throw new HelpError(
          `Conflicting options: --${alias} and --${canonical} cannot both be specified`,
        );
      }
      result[canonical] = aliasValue;
    }

    // Remove the alias key
    delete result[alias];
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
  args?: string[];
  options?: TOptions;
  positionals?: TPositionals;
}

/**
 * Parse arguments for a simple CLI (no commands).
 *
 * @function
 */
export const parseSimple = <
  TOptions extends OptionsSchema = OptionsSchema,
  TPositionals extends PositionalsSchema = PositionalsSchema,
>(
  config: ParseSimpleOptions<TOptions, TPositionals>,
): ParseResult<InferOptions<TOptions>, InferPositionals<TPositionals>> => {
  const {
    args = process.argv.slice(2),
    options: optionsSchema = {} as TOptions,
    positionals: positionalsSchema = [] as unknown as TPositionals,
  } = config;

  // Build parseArgs config
  const parseArgsOptions = buildParseArgsConfig(optionsSchema);

  // Parse with Node.js util.parseArgs
  const { positionals, values } = parseArgs({
    allowPositionals: positionalsSchema.length > 0,
    args,
    options: parseArgsOptions,
    strict: true,
  });

  // Process negated boolean options (--no-<flag>)
  const processedValues = processNegatedBooleans(
    values as Record<string, unknown>,
    optionsSchema,
  );

  // Collapse multi-character aliases into canonical names
  const collapsedValues = collapseAliases(processedValues, optionsSchema);

  // Coerce and apply defaults
  const coercedValues = coerceValues(collapsedValues, optionsSchema);
  const coercedPositionals = coercePositionals(positionals, positionalsSchema);

  return {
    positionals: coercedPositionals as InferPositionals<TPositionals>,
    values: coercedValues as InferOptions<TOptions>,
  };
};
