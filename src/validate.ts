/**
 * Configuration validation for bargs.
 *
 * Validates bargs configuration objects at runtime before parsing, ensuring:
 *
 * - Required properties are present and correctly typed
 * - Option definitions have valid type discriminators and defaults
 * - Aliases are single characters with no conflicts
 * - Positional schemas have variadic args last and required args before optional
 * - Command handlers are properly defined
 * - Command-based CLIs don't have top-level positionals or handlers
 *
 * Throws {@link ValidationError} with detailed path information when invalid.
 *
 * @packageDocumentation
 */

import type {
  BargsConfig,
  BargsConfigWithCommands,
  CommandConfigInput,
  OptionsSchema,
  PositionalsSchema,
} from './types.js';

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

const isFunction = (value: unknown): value is (...args: unknown[]) => unknown =>
  typeof value === 'function';

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
const validateOptionsSchema = (
  schema: unknown,
  path: string,
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
 * Validate a positionals schema. Checks:
 *
 * - Each positional has valid structure
 * - Variadic positional (if present) is last
 * - Required positionals don't follow optional ones
 */
const validatePositionalsSchema = (schema: unknown, path: string): void => {
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

// ─── Handler Validation ─────────────────────────────────────────────────────

/**
 * Validate a handler function.
 */
const validateHandler = (handler: unknown, path: string): void => {
  if (handler === undefined) {
    return; // handlers are optional in some contexts
  }

  if (!isFunction(handler)) {
    throw new ValidationError(path, 'must be a function');
  }
};

// ─── Transforms Validation ──────────────────────────────────────────────────

/**
 * Validate a transforms configuration object.
 */
const validateTransforms = (transforms: unknown, path: string): void => {
  if (transforms === undefined) {
    return; // transforms are optional
  }

  if (!isObject(transforms)) {
    throw new ValidationError(path, 'must be an object');
  }

  if (transforms['values'] !== undefined && !isFunction(transforms['values'])) {
    throw new ValidationError(`${path}.values`, 'must be a function');
  }

  if (
    transforms['positionals'] !== undefined &&
    !isFunction(transforms['positionals'])
  ) {
    throw new ValidationError(`${path}.positionals`, 'must be a function');
  }
};

// ─── Command Validation ─────────────────────────────────────────────────────

/**
 * Validate a single command configuration.
 */
const validateCommand = (
  name: string,
  cmd: unknown,
  path: string,
  globalAliases: Map<string, string>,
): void => {
  if (!isObject(cmd)) {
    throw new ValidationError(path, 'command must be an object');
  }

  // description is required
  if (typeof cmd['description'] !== 'string') {
    throw new ValidationError(`${path}.description`, 'must be a string');
  }

  // handler is required for commands
  if (cmd['handler'] === undefined) {
    throw new ValidationError(`${path}.handler`, 'is required');
  }
  validateHandler(cmd['handler'], `${path}.handler`);

  // Validate options (command-local aliases only, no collision with globals)
  // Create a new alias map that includes global aliases for collision detection
  const commandAliases = new Map(globalAliases);
  validateOptionsSchema(cmd['options'], `${path}.options`, commandAliases);

  // Validate positionals
  validatePositionalsSchema(cmd['positionals'], `${path}.positionals`);

  // Validate transforms (optional)
  validateTransforms(cmd['transforms'], `${path}.transforms`);
};

/**
 * Validate commands record.
 */
const validateCommands = (
  commands: unknown,
  path: string,
  globalAliases: Map<string, string>,
): Set<string> => {
  if (!isObject(commands)) {
    throw new ValidationError(path, 'must be an object');
  }

  const commandNames = Object.keys(commands);
  if (commandNames.length === 0) {
    throw new ValidationError(path, 'must have at least one command');
  }

  for (const [name, cmd] of Object.entries(commands)) {
    validateCommand(name, cmd, `${path}.${name}`, globalAliases);
  }

  return new Set(commandNames);
};

// ─── Main Config Validation ─────────────────────────────────────────────────

/**
 * Validate base config properties common to both simple and command-based CLIs.
 */
const validateBaseConfig = (
  config: unknown,
  path: string,
): { aliases: Map<string, string>; configObj: Record<string, unknown> } => {
  if (!isObject(config)) {
    throw new ValidationError(path, 'config must be an object');
  }

  // name is required
  if (typeof config['name'] !== 'string') {
    throw new ValidationError(`${path}.name`, 'must be a string');
  }
  if (config['name'].length === 0) {
    throw new ValidationError(`${path}.name`, 'must not be empty');
  }

  // description is optional
  if (
    config['description'] !== undefined &&
    typeof config['description'] !== 'string'
  ) {
    throw new ValidationError(`${path}.description`, 'must be a string');
  }

  // version is optional
  if (
    config['version'] !== undefined &&
    typeof config['version'] !== 'string'
  ) {
    throw new ValidationError(`${path}.version`, 'must be a string');
  }

  // args is optional
  if (config['args'] !== undefined && !isStringArray(config['args'])) {
    throw new ValidationError(`${path}.args`, 'must be an array of strings');
  }

  // Validate options
  const aliases = new Map<string, string>();
  validateOptionsSchema(config['options'], `${path}.options`, aliases);

  return { aliases, configObj: config };
};

/**
 * Check if config appears to be a command-based CLI. Returns true if commands
 * property exists (even if empty - validation will catch that).
 */
const isCommandConfig = (config: Record<string, unknown>): boolean => {
  return config['commands'] !== undefined;
};

/**
 * Validate a simple CLI config (no commands).
 */
const validateSimpleConfig = (
  config: Record<string, unknown>,
  path: string,
  _aliases: Map<string, string>,
): void => {
  // Validate positionals
  validatePositionalsSchema(config['positionals'], `${path}.positionals`);

  // Validate handler (optional for simple CLI)
  validateHandler(config['handler'], `${path}.handler`);

  // Validate transforms (optional)
  validateTransforms(config['transforms'], `${path}.transforms`);
};

/**
 * Validate a command-based CLI config.
 */
const validateCommandConfig = (
  config: Record<string, unknown>,
  path: string,
  aliases: Map<string, string>,
): void => {
  // Commands must exist and have entries
  const commandNames = validateCommands(
    config['commands'],
    `${path}.commands`,
    aliases,
  );

  // Positionals should not be present at top level
  if (config['positionals'] !== undefined) {
    const positionals = config['positionals'];
    if (Array.isArray(positionals) && positionals.length > 0) {
      throw new ValidationError(
        `${path}.positionals`,
        'top-level positionals are not allowed in command-based CLIs (define them per-command)',
      );
    }
  }

  // handler should not be present (use defaultHandler instead)
  if (config['handler'] !== undefined) {
    throw new ValidationError(
      `${path}.handler`,
      'use defaultHandler for command-based CLIs',
    );
  }

  // Validate defaultHandler
  const defaultHandler = config['defaultHandler'];
  if (defaultHandler !== undefined) {
    if (typeof defaultHandler === 'string') {
      // Must reference an existing command
      if (!commandNames.has(defaultHandler)) {
        throw new ValidationError(
          `${path}.defaultHandler`,
          `must reference an existing command, got "${defaultHandler}"`,
        );
      }
    } else if (!isFunction(defaultHandler)) {
      throw new ValidationError(
        `${path}.defaultHandler`,
        'must be a function or command name string',
      );
    }
  }

  // Validate top-level transforms (optional, run before command-level transforms)
  validateTransforms(config['transforms'], `${path}.transforms`);
};

/**
 * Validate a bargs configuration object. Throws ValidationError if invalid.
 *
 * This validates both simple CLI configs (BargsConfig) and command-based CLI
 * configs (BargsConfigWithCommands).
 *
 * @param config - The configuration to validate
 * @throws ValidationError if the config is invalid
 */
export const validateConfig = (
  config:
    | BargsConfig<
        OptionsSchema,
        PositionalsSchema,
        Record<string, CommandConfigInput> | undefined
      >
    | BargsConfig<OptionsSchema, PositionalsSchema, undefined>
    | BargsConfigWithCommands<
        OptionsSchema,
        Record<string, CommandConfigInput>
      >,
): void => {
  const { aliases, configObj } = validateBaseConfig(config, 'config');

  if (isCommandConfig(configObj)) {
    validateCommandConfig(configObj, 'config', aliases);
  } else {
    validateSimpleConfig(configObj, 'config', aliases);
  }
};
