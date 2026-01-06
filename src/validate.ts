/**
 * Configuration validation for bargs.
 *
 * Validates option and positional schemas at runtime.
 *
 * @packageDocumentation
 */

// Note: OptionsSchema and PositionalsSchema types are used for docs but
// the actual validation accepts `unknown` to validate at runtime

import { ValidationError } from './errors.js';

/** Valid option type discriminators */
const VALID_OPTION_TYPES = [
  'string',
  'boolean',
  'number',
  'enum',
  'array',
  'count',
] as const;

/** Valid positional type discriminators */
const VALID_POSITIONAL_TYPES = [
  'string',
  'number',
  'enum',
  'variadic',
] as const;

/** Valid array/variadic item types */
const VALID_ITEM_TYPES = ['string', 'number'] as const;

// ─── Primitive Helpers ──────────────────────────────────────────────────────

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((v) => typeof v === 'string');

const isNumberArray = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every((v) => typeof v === 'number');

// ─── Option Validation ──────────────────────────────────────────────────────

/**
 * Validate a single option definition.
 */
const validateOption = (
  name: string,
  opt: unknown,
  path: string,
  allAliases: Map<string, string>,
): void => {
  if (!isObject(opt)) {
    throw new ValidationError(path, 'option must be an object');
  }

  // Validate type discriminator
  const type = opt['type'];
  if (typeof type !== 'string') {
    throw new ValidationError(`${path}.type`, 'must be a string');
  }
  if (
    !VALID_OPTION_TYPES.includes(type as (typeof VALID_OPTION_TYPES)[number])
  ) {
    throw new ValidationError(
      `${path}.type`,
      `must be one of: ${VALID_OPTION_TYPES.join(', ')}`,
    );
  }

  // Validate optional description
  if (
    opt['description'] !== undefined &&
    typeof opt['description'] !== 'string'
  ) {
    throw new ValidationError(`${path}.description`, 'must be a string');
  }

  // Validate optional group
  if (opt['group'] !== undefined && typeof opt['group'] !== 'string') {
    throw new ValidationError(`${path}.group`, 'must be a string');
  }

  // Validate optional hidden
  if (opt['hidden'] !== undefined && typeof opt['hidden'] !== 'boolean') {
    throw new ValidationError(`${path}.hidden`, 'must be a boolean');
  }

  // Validate optional required
  if (opt['required'] !== undefined && typeof opt['required'] !== 'boolean') {
    throw new ValidationError(`${path}.required`, 'must be a boolean');
  }

  // Validate aliases
  if (opt['aliases'] !== undefined) {
    if (!isStringArray(opt['aliases'])) {
      throw new ValidationError(
        `${path}.aliases`,
        'must be an array of strings',
      );
    }
    for (let i = 0; i < opt['aliases'].length; i++) {
      const alias = opt['aliases'][i]!;
      if (alias.length !== 1) {
        throw new ValidationError(
          `${path}.aliases[${i}]`,
          `alias must be a single character, got "${alias}"`,
        );
      }
      // Check for duplicates
      const existingOption = allAliases.get(alias);
      if (existingOption !== undefined) {
        throw new ValidationError(
          `${path}.aliases[${i}]`,
          `alias "${alias}" is already used by option "${existingOption}"`,
        );
      }
      allAliases.set(alias, name);
    }
  }

  // Type-specific validation
  switch (type) {
    case 'array': {
      const items = opt['items'];
      if (typeof items !== 'string') {
        throw new ValidationError(
          `${path}.items`,
          'must be "string" or "number"',
        );
      }
      if (
        !VALID_ITEM_TYPES.includes(items as (typeof VALID_ITEM_TYPES)[number])
      ) {
        throw new ValidationError(
          `${path}.items`,
          'must be "string" or "number"',
        );
      }
      if (opt['default'] !== undefined) {
        if (items === 'string') {
          if (!isStringArray(opt['default'])) {
            throw new ValidationError(
              `${path}.default`,
              'must be an array of strings',
            );
          }
        } else {
          if (!isNumberArray(opt['default'])) {
            throw new ValidationError(
              `${path}.default`,
              'must be an array of numbers',
            );
          }
        }
      }
      break;
    }

    case 'boolean':
      if (opt['default'] !== undefined && typeof opt['default'] !== 'boolean') {
        throw new ValidationError(`${path}.default`, 'must be a boolean');
      }
      break;

    case 'count':
      if (opt['default'] !== undefined && typeof opt['default'] !== 'number') {
        throw new ValidationError(`${path}.default`, 'must be a number');
      }
      break;

    case 'enum': {
      const choices = opt['choices'];
      if (!isStringArray(choices)) {
        throw new ValidationError(
          `${path}.choices`,
          'must be a non-empty array of strings',
        );
      }
      if (choices.length === 0) {
        throw new ValidationError(`${path}.choices`, 'must not be empty');
      }
      if (opt['default'] !== undefined) {
        if (typeof opt['default'] !== 'string') {
          throw new ValidationError(`${path}.default`, 'must be a string');
        }
        if (!choices.includes(opt['default'])) {
          throw new ValidationError(
            `${path}.default`,
            `must be one of the choices: ${choices.join(', ')}`,
          );
        }
      }
      break;
    }

    case 'number':
      if (opt['default'] !== undefined && typeof opt['default'] !== 'number') {
        throw new ValidationError(`${path}.default`, 'must be a number');
      }
      break;

    case 'string':
      if (opt['default'] !== undefined && typeof opt['default'] !== 'string') {
        throw new ValidationError(`${path}.default`, 'must be a string');
      }
      break;
  }
};

/**
 * Validate an options schema.
 */
export const validateOptionsSchema = (
  schema: unknown,
  path: string = 'options',
  allAliases: Map<string, string> = new Map(),
): void => {
  if (schema === undefined) {
    return; // optional
  }

  if (!isObject(schema)) {
    throw new ValidationError(path, 'must be an object');
  }

  for (const [name, opt] of Object.entries(schema)) {
    validateOption(name, opt, `${path}.${name}`, allAliases);
  }
};

// ─── Positional Validation ──────────────────────────────────────────────────

/**
 * Validate a single positional definition.
 */
const validatePositional = (
  index: number,
  pos: unknown,
  path: string,
): void => {
  if (!isObject(pos)) {
    throw new ValidationError(path, 'positional must be an object');
  }

  // Validate type discriminator
  const type = pos['type'];
  if (typeof type !== 'string') {
    throw new ValidationError(`${path}.type`, 'must be a string');
  }
  if (
    !VALID_POSITIONAL_TYPES.includes(
      type as (typeof VALID_POSITIONAL_TYPES)[number],
    )
  ) {
    throw new ValidationError(
      `${path}.type`,
      `must be one of: ${VALID_POSITIONAL_TYPES.join(', ')}`,
    );
  }

  // Validate optional description
  if (
    pos['description'] !== undefined &&
    typeof pos['description'] !== 'string'
  ) {
    throw new ValidationError(`${path}.description`, 'must be a string');
  }

  // Validate optional name
  if (pos['name'] !== undefined && typeof pos['name'] !== 'string') {
    throw new ValidationError(`${path}.name`, 'must be a string');
  }

  // Validate optional required
  if (pos['required'] !== undefined && typeof pos['required'] !== 'boolean') {
    throw new ValidationError(`${path}.required`, 'must be a boolean');
  }

  // Type-specific validation
  switch (type) {
    case 'enum': {
      const choices = pos['choices'];
      if (!isStringArray(choices)) {
        throw new ValidationError(
          `${path}.choices`,
          'must be a non-empty array of strings',
        );
      }
      if (choices.length === 0) {
        throw new ValidationError(`${path}.choices`, 'must not be empty');
      }
      if (pos['default'] !== undefined) {
        if (typeof pos['default'] !== 'string') {
          throw new ValidationError(`${path}.default`, 'must be a string');
        }
        if (!choices.includes(pos['default'])) {
          throw new ValidationError(
            `${path}.default`,
            `must be one of the choices: ${choices.join(', ')}`,
          );
        }
      }
      break;
    }

    case 'number':
      if (pos['default'] !== undefined && typeof pos['default'] !== 'number') {
        throw new ValidationError(`${path}.default`, 'must be a number');
      }
      break;

    case 'string':
      if (pos['default'] !== undefined && typeof pos['default'] !== 'string') {
        throw new ValidationError(`${path}.default`, 'must be a string');
      }
      break;

    case 'variadic': {
      const items = pos['items'];
      if (typeof items !== 'string') {
        throw new ValidationError(
          `${path}.items`,
          'must be "string" or "number"',
        );
      }
      if (
        !VALID_ITEM_TYPES.includes(items as (typeof VALID_ITEM_TYPES)[number])
      ) {
        throw new ValidationError(
          `${path}.items`,
          'must be "string" or "number"',
        );
      }
      break;
    }
  }
};

/**
 * Validate a positionals schema.
 */
export const validatePositionalsSchema = (
  schema: unknown,
  path: string = 'positionals',
): void => {
  if (schema === undefined) {
    return; // optional
  }

  if (!Array.isArray(schema)) {
    throw new ValidationError(path, 'must be an array');
  }

  // Validate each positional
  for (let i = 0; i < schema.length; i++) {
    validatePositional(i, schema[i], `${path}[${i}]`);
  }

  // Check variadic is last
  const variadicIndex = schema.findIndex(
    (p) => isObject(p) && p['type'] === 'variadic',
  );
  if (variadicIndex !== -1 && variadicIndex !== schema.length - 1) {
    throw new ValidationError(
      `${path}[${variadicIndex}]`,
      'variadic positional must be the last positional argument',
    );
  }

  // Check required doesn't follow optional
  let seenOptional = false;
  for (let i = 0; i < schema.length; i++) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const pos = schema[i];
    if (!isObject(pos)) {
      continue;
    }

    const isOptional =
      pos['required'] !== true &&
      !('default' in pos && pos['default'] !== undefined);
    const isVariadic = pos['type'] === 'variadic';

    if (isOptional) {
      seenOptional = true;
    } else if (seenOptional && !isVariadic) {
      throw new ValidationError(
        `${path}[${i}]`,
        'required positional cannot follow an optional positional',
      );
    }
  }
};
