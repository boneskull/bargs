# bargs Core Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a TypeScript-first CLI argument parser wrapping `util.parseArgs()` with Zod schema validation, colorful help output, and command support.

**Architecture:** Zod schemas define CLI options; bargs extracts `util.parseArgs()` config from schema introspection, parses args, merges with defaults, validates through Zod (including transforms for middleware), then runs handlers. ANSI colors via hand-rolled escape codes.

**Tech Stack:** Node.js 22+, TypeScript, Zod v4, `node:util.parseArgs()`, `node:test` + bupkis

---

## Task 1: Core Types

**Files:**

- Create: `src/types.ts`
- Test: `test/types.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it } from 'node:test';
import { expect } from 'bupkis';
import { z } from 'zod';
import type { BargsConfig, SimpleBargsConfig, CommandBargsConfig } from '../src/types.js';

describe('types', () => {
  it('should allow a simple config without commands', () => {
    const config: SimpleBargsConfig = {
      name: 'mycli',
      options: z.object({
        verbose: z.boolean().default(false),
      }),
    };
    expect(config.name, 'to equal', 'mycli');
  });

  it('should allow a config with commands', () => {
    const config: CommandBargsConfig = {
      name: 'mycli',
      globalOptions: z.object({
        verbose: z.boolean().default(false),
      }),
      commands: {
        add: {
          description: 'Add files',
          handler: async () => {},
        },
      },
    };
    expect(config.name, 'to equal', 'mycli');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL with "Cannot find module '../src/types.js'"

**Step 3: Write minimal implementation**

```typescript
import type { z, ZodObject, ZodTuple, ZodArray, ZodRawShape } from 'zod';

/**
 * Aliases map canonical option names to arrays of alias strings.
 *
 * @example
 *   { verbose: ['v'], config: ['c', 'config-file'] }
 */
export type Aliases<T extends ZodRawShape> = {
  [K in keyof T]?: string[];
};

/**
 * Inferred type from a Zod schema (after transforms).
 */
export type Inferred<T extends z.ZodTypeAny> = z.infer<T>;

/**
 * Handler function signature.
 */
export type Handler<TArgs> = (args: TArgs) => Promise<void> | void;

/**
 * Command definition.
 */
export interface CommandConfig<
  TOptions extends ZodObject<ZodRawShape> = ZodObject<ZodRawShape>,
  TPositionals extends ZodTuple | ZodArray<z.ZodTypeAny> | undefined = undefined,
> {
  description: string;
  options?: TOptions;
  positionals?: TPositionals;
  aliases?: TOptions extends ZodObject<infer S> ? Aliases<S> : never;
  handler: Handler<
    Inferred<TOptions> & (TPositionals extends z.ZodTypeAny ? { positionals: Inferred<TPositionals> } : object)
  >;
}

/**
 * Simple CLI config (no commands).
 */
export interface SimpleBargsConfig<
  TOptions extends ZodObject<ZodRawShape> = ZodObject<ZodRawShape>,
  TPositionals extends ZodTuple | ZodArray<z.ZodTypeAny> | undefined = undefined,
> {
  name: string;
  description?: string;
  version?: string;
  options?: TOptions;
  positionals?: TPositionals;
  aliases?: TOptions extends ZodObject<infer S> ? Aliases<S> : never;
  defaults?: Partial<Inferred<TOptions>>;
  handler?: Handler<
    Inferred<TOptions> & (TPositionals extends z.ZodTypeAny ? { positionals: Inferred<TPositionals> } : object)
  >;
  args?: string[];
}

/**
 * Default handler: either a command name or a handler function.
 */
export type DefaultHandler<TGlobalOptions, TCommands extends Record<string, CommandConfig>> =
  | keyof TCommands
  | Handler<TGlobalOptions>;

/**
 * Command-based CLI config.
 */
export interface CommandBargsConfig<
  TGlobalOptions extends ZodObject<ZodRawShape> = ZodObject<ZodRawShape>,
  TCommands extends Record<string, CommandConfig> = Record<string, CommandConfig>,
> {
  name: string;
  description?: string;
  version?: string;
  globalOptions?: TGlobalOptions;
  globalAliases?: TGlobalOptions extends ZodObject<infer S> ? Aliases<S> : never;
  commands: TCommands;
  defaultHandler?: DefaultHandler<Inferred<TGlobalOptions>, TCommands>;
  args?: string[];
}

/**
 * Union of all config types.
 */
export type BargsConfig = SimpleBargsConfig | CommandBargsConfig;
```

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add src/types.ts test/types.test.ts
git commit -m "feat: add core type definitions"
```

---

## Task 2: ANSI Color Utilities

**Files:**

- Create: `src/ansi.ts`
- Test: `test/ansi.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it } from 'node:test';
import { expect } from 'bupkis';
import { ansi, bold, dim, red, green, yellow, cyan, stripAnsi } from '../src/ansi.js';

describe('ansi', () => {
  it('should wrap text in bold', () => {
    const result = bold('hello');
    expect(result, 'to equal', '\x1b[1mhello\x1b[22m');
  });

  it('should wrap text in dim', () => {
    const result = dim('hello');
    expect(result, 'to equal', '\x1b[2mhello\x1b[22m');
  });

  it('should wrap text in red', () => {
    const result = red('error');
    expect(result, 'to equal', '\x1b[31merror\x1b[39m');
  });

  it('should wrap text in green', () => {
    const result = green('success');
    expect(result, 'to equal', '\x1b[32msuccess\x1b[39m');
  });

  it('should wrap text in yellow', () => {
    const result = yellow('warning');
    expect(result, 'to equal', '\x1b[33mwarning\x1b[39m');
  });

  it('should wrap text in cyan', () => {
    const result = cyan('info');
    expect(result, 'to equal', '\x1b[36minfo\x1b[39m');
  });

  it('should strip ANSI codes', () => {
    const result = stripAnsi(bold(red('hello')));
    expect(result, 'to equal', 'hello');
  });

  it('should allow composing styles', () => {
    const result = bold(red('error'));
    expect(result, 'to contain', '\x1b[1m');
    expect(result, 'to contain', '\x1b[31m');
    expect(stripAnsi(result), 'to equal', 'error');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL with "Cannot find module '../src/ansi.js'"

**Step 3: Write minimal implementation**

```typescript
/**
 * ANSI escape code constants.
 */
export const ansi = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  boldOff: '\x1b[22m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  colorOff: '\x1b[39m',
} as const;

/**
 * Wrap text with ANSI codes.
 */
const wrap = (open: string, close: string) => (text: string) => `${open}${text}${close}`;

export const bold = wrap(ansi.bold, ansi.boldOff);
export const dim = wrap(ansi.dim, ansi.boldOff);
export const red = wrap(ansi.red, ansi.colorOff);
export const green = wrap(ansi.green, ansi.colorOff);
export const yellow = wrap(ansi.yellow, ansi.colorOff);
export const blue = wrap(ansi.blue, ansi.colorOff);
export const magenta = wrap(ansi.magenta, ansi.colorOff);
export const cyan = wrap(ansi.cyan, ansi.colorOff);
export const white = wrap(ansi.white, ansi.colorOff);

/**
 * Strip all ANSI escape codes from a string.
 */
// eslint-disable-next-line no-control-regex
export const stripAnsi = (text: string) => text.replace(/\x1b\[[0-9;]*m/g, '');
```

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add src/ansi.ts test/ansi.test.ts
git commit -m "feat: add ANSI color utilities"
```

---

## Task 3: Schema Introspection - Extract parseArgs Config

**Files:**

- Create: `src/schema.ts`
- Test: `test/schema.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it } from 'node:test';
import { expect } from 'bupkis';
import { z } from 'zod';
import { extractParseArgsConfig, getSchemaMetadata } from '../src/schema.js';

describe('schema introspection', () => {
  describe('extractParseArgsConfig', () => {
    it('should extract boolean option', () => {
      const schema = z.object({
        verbose: z.boolean(),
      });
      const config = extractParseArgsConfig(schema, {});
      expect(config, 'to satisfy', {
        verbose: { type: 'boolean' },
      });
    });

    it('should extract string option', () => {
      const schema = z.object({
        output: z.string(),
      });
      const config = extractParseArgsConfig(schema, {});
      expect(config, 'to satisfy', {
        output: { type: 'string' },
      });
    });

    it('should extract array option as multiple', () => {
      const schema = z.object({
        files: z.string().array(),
      });
      const config = extractParseArgsConfig(schema, {});
      expect(config, 'to satisfy', {
        files: { type: 'string', multiple: true },
      });
    });

    it('should handle optional types', () => {
      const schema = z.object({
        output: z.string().optional(),
      });
      const config = extractParseArgsConfig(schema, {});
      expect(config, 'to satisfy', {
        output: { type: 'string' },
      });
    });

    it('should handle default types', () => {
      const schema = z.object({
        verbose: z.boolean().default(false),
      });
      const config = extractParseArgsConfig(schema, {});
      expect(config, 'to satisfy', {
        verbose: { type: 'boolean', default: false },
      });
    });

    it('should apply aliases', () => {
      const schema = z.object({
        verbose: z.boolean(),
      });
      const config = extractParseArgsConfig(schema, { verbose: ['v'] });
      expect(config, 'to satisfy', {
        verbose: { type: 'boolean', short: 'v' },
      });
    });

    it('should use first single-char alias as short', () => {
      const schema = z.object({
        config: z.string(),
      });
      const config = extractParseArgsConfig(schema, { config: ['config-file', 'c'] });
      expect(config, 'to satisfy', {
        config: { type: 'string', short: 'c' },
      });
    });
  });

  describe('getSchemaMetadata', () => {
    it('should extract description from meta', () => {
      const schema = z.string().meta({ description: 'A test description' });
      const meta = getSchemaMetadata(schema);
      expect(meta.description, 'to equal', 'A test description');
    });

    it('should extract group from meta', () => {
      const schema = z.string().meta({ group: 'Output Options' });
      const meta = getSchemaMetadata(schema);
      expect(meta.group, 'to equal', 'Output Options');
    });

    it('should return empty object for schema without meta', () => {
      const schema = z.string();
      const meta = getSchemaMetadata(schema);
      expect(meta, 'to equal', {});
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL with "Cannot find module '../src/schema.js'"

**Step 3: Write minimal implementation**

```typescript
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
 * Get the base type of a Zod schema, unwrapping optionals, defaults, etc.
 */
const unwrapSchema = (schema: ZodTypeAny): ZodTypeAny => {
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    return unwrapSchema(schema.unwrap());
  }
  if (schema instanceof z.ZodDefault) {
    return unwrapSchema(schema._def.innerType);
  }
  if (schema instanceof z.ZodEffects) {
    return unwrapSchema(schema._def.schema);
  }
  return schema;
};

/**
 * Get the parseArgs type for a Zod schema.
 */
const getParseArgsType = (schema: ZodTypeAny): 'string' | 'boolean' => {
  const base = unwrapSchema(schema);

  if (base instanceof z.ZodBoolean) {
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
  return base instanceof z.ZodArray;
};

/**
 * Get the default value from a schema if it has one.
 */
const getDefaultValue = (schema: ZodTypeAny): unknown => {
  if (schema instanceof z.ZodDefault) {
    return schema._def.defaultValue();
  }
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    return getDefaultValue(schema.unwrap());
  }
  return undefined;
};

/**
 * Extract metadata from a Zod schema's global registry.
 */
export const getSchemaMetadata = (schema: ZodTypeAny): SchemaMetadata => {
  const meta = z.globalRegistry.get(schema);
  if (!meta) {
    return {};
  }
  return {
    description: meta.description,
    group: meta.group as string | undefined,
    examples: meta.examples as unknown[] | undefined,
  };
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
      if (base instanceof z.ZodArray) {
        optionConfig.type = getParseArgsType(base.element);
      }
    }

    const defaultValue = getDefaultValue(fieldSchema as ZodTypeAny);
    if (defaultValue !== undefined) {
      optionConfig.default = defaultValue;
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
```

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add src/schema.ts test/schema.test.ts
git commit -m "feat: add schema introspection for parseArgs config extraction"
```

---

## Task 4: Help Text Generation

**Files:**

- Create: `src/help.ts`
- Test: `test/help.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it } from 'node:test';
import { expect } from 'bupkis';
import { z } from 'zod';
import { generateHelp, formatOptionHelp } from '../src/help.js';
import { stripAnsi } from '../src/ansi.js';

describe('help generation', () => {
  describe('formatOptionHelp', () => {
    it('should format a simple boolean option', () => {
      const result = formatOptionHelp('verbose', z.boolean(), { verbose: ['v'] });
      const plain = stripAnsi(result);
      expect(plain, 'to contain', '-v, --verbose');
      expect(plain, 'to contain', '[boolean]');
    });

    it('should format a string option with description', () => {
      const schema = z.string().meta({ description: 'Output file path' });
      const result = formatOptionHelp('output', schema, { output: ['o'] });
      const plain = stripAnsi(result);
      expect(plain, 'to contain', '-o, --output');
      expect(plain, 'to contain', 'Output file path');
      expect(plain, 'to contain', '[string]');
    });

    it('should show default value', () => {
      const schema = z.boolean().default(false);
      const result = formatOptionHelp('verbose', schema, {});
      const plain = stripAnsi(result);
      expect(plain, 'to contain', 'default: false');
    });
  });

  describe('generateHelp', () => {
    it('should generate help for simple CLI', () => {
      const config = {
        name: 'mycli',
        description: 'A test CLI',
        version: '1.0.0',
        options: z.object({
          verbose: z.boolean().default(false).meta({ description: 'Enable verbose output' }),
          output: z.string().optional().meta({ description: 'Output file' }),
        }),
        aliases: { verbose: ['v'], output: ['o'] },
      };
      const help = generateHelp(config);
      const plain = stripAnsi(help);

      expect(plain, 'to contain', 'mycli');
      expect(plain, 'to contain', '1.0.0');
      expect(plain, 'to contain', 'A test CLI');
      expect(plain, 'to contain', '-v, --verbose');
      expect(plain, 'to contain', '-o, --output');
    });

    it('should generate help for CLI with commands', () => {
      const config = {
        name: 'mycli',
        description: 'A test CLI',
        globalOptions: z.object({
          verbose: z.boolean().default(false),
        }),
        commands: {
          add: { description: 'Add files', handler: async () => {} },
          commit: { description: 'Commit changes', handler: async () => {} },
        },
      };
      const help = generateHelp(config);
      const plain = stripAnsi(help);

      expect(plain, 'to contain', 'COMMANDS');
      expect(plain, 'to contain', 'add');
      expect(plain, 'to contain', 'Add files');
      expect(plain, 'to contain', 'commit');
      expect(plain, 'to contain', 'Commit changes');
    });

    it('should group options by group metadata', () => {
      const config = {
        name: 'mycli',
        options: z.object({
          verbose: z.boolean().meta({ description: 'Verbose', group: 'Output' }),
          quiet: z.boolean().meta({ description: 'Quiet', group: 'Output' }),
          input: z.string().meta({ description: 'Input file', group: 'Input' }),
        }),
      };
      const help = generateHelp(config);
      const plain = stripAnsi(help);

      expect(plain, 'to contain', 'Output');
      expect(plain, 'to contain', 'Input');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL with "Cannot find module '../src/help.js'"

**Step 3: Write minimal implementation**

```typescript
import { z, type ZodTypeAny, type ZodObject, type ZodRawShape } from 'zod';
import { bold, cyan, dim, yellow } from './ansi.js';
import { getSchemaMetadata } from './schema.js';
import type { Aliases, SimpleBargsConfig, CommandBargsConfig, BargsConfig } from './types.js';

/**
 * Unwrap schema to get base type.
 */
const unwrapSchema = (schema: ZodTypeAny): ZodTypeAny => {
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    return unwrapSchema(schema.unwrap());
  }
  if (schema instanceof z.ZodDefault) {
    return unwrapSchema(schema._def.innerType);
  }
  if (schema instanceof z.ZodEffects) {
    return unwrapSchema(schema._def.schema);
  }
  return schema;
};

/**
 * Get type label for help display.
 */
const getTypeLabel = (schema: ZodTypeAny): string => {
  const base = unwrapSchema(schema);

  if (base instanceof z.ZodBoolean) return 'boolean';
  if (base instanceof z.ZodNumber) return 'number';
  if (base instanceof z.ZodArray) return `${getTypeLabel(base.element)}[]`;
  if (base instanceof z.ZodEnum) return base.options.join(' | ');
  return 'string';
};

/**
 * Get default value if present.
 */
const getDefaultValue = (schema: ZodTypeAny): unknown => {
  if (schema instanceof z.ZodDefault) {
    return schema._def.defaultValue();
  }
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    return getDefaultValue(schema.unwrap());
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
```

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add src/help.ts test/help.test.ts
git commit -m "feat: add help text generation with grouping and colors"
```

---

## Task 5: Error Formatting

**Files:**

- Create: `src/errors.ts`
- Test: `test/errors.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it } from 'node:test';
import { expect } from 'bupkis';
import { z } from 'zod';
import { formatZodError, BargsError } from '../src/errors.js';
import { stripAnsi } from '../src/ansi.js';

describe('error formatting', () => {
  describe('formatZodError', () => {
    it('should format a simple type error', () => {
      const schema = z.object({
        count: z.number(),
      });
      const result = schema.safeParse({ count: 'not a number' });
      if (result.success) throw new Error('Expected failure');

      const formatted = formatZodError(result.error);
      const plain = stripAnsi(formatted);

      expect(plain, 'to contain', 'count');
      expect(plain, 'to contain', 'number');
    });

    it('should format multiple errors', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });
      const result = schema.safeParse({ name: 123, age: 'old' });
      if (result.success) throw new Error('Expected failure');

      const formatted = formatZodError(result.error);
      const plain = stripAnsi(formatted);

      expect(plain, 'to contain', 'name');
      expect(plain, 'to contain', 'age');
    });

    it('should format nested path errors', () => {
      const schema = z.object({
        config: z.object({
          port: z.number(),
        }),
      });
      const result = schema.safeParse({ config: { port: 'abc' } });
      if (result.success) throw new Error('Expected failure');

      const formatted = formatZodError(result.error);
      const plain = stripAnsi(formatted);

      expect(plain, 'to contain', 'config.port');
    });
  });

  describe('BargsError', () => {
    it('should create an error with name', () => {
      const error = new BargsError('test message');
      expect(error.name, 'to equal', 'BargsError');
      expect(error.message, 'to equal', 'test message');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL with "Cannot find module '../src/errors.js'"

**Step 3: Write minimal implementation**

```typescript
import type { ZodError } from 'zod';
import { bold, red, dim } from './ansi.js';

/**
 * Custom error class for bargs errors.
 */
export class BargsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BargsError';
  }
}

/**
 * Format a Zod error for CLI display.
 */
export const formatZodError = (error: ZodError): string => {
  const lines: string[] = [];

  lines.push('');
  lines.push(red(bold('Invalid arguments')));
  lines.push('');

  const flat = error.flatten();

  // Field errors
  for (const [field, messages] of Object.entries(flat.fieldErrors)) {
    if (messages && messages.length > 0) {
      const flagName = `--${field}`;
      lines.push(`  ${bold(flagName)}  ${messages.join(', ')}`);
    }
  }

  // Handle nested paths from issues directly
  for (const issue of error.issues) {
    if (issue.path.length > 1) {
      const path = issue.path.join('.');
      lines.push(`  ${bold(path)}  ${issue.message}`);
    }
  }

  // Form errors (root level)
  if (flat.formErrors.length > 0) {
    for (const msg of flat.formErrors) {
      lines.push(`  ${msg}`);
    }
  }

  lines.push('');

  return lines.join('\n');
};

/**
 * Print error and exit.
 */
export const exitWithError = (message: string, cliName: string): never => {
  console.error(message);
  console.error(dim(`Run '${cliName} --help' for usage.`));
  process.exit(1);
};

/**
 * Print Zod error and exit.
 */
export const exitWithZodError = (error: ZodError, cliName: string): never => {
  const formatted = formatZodError(error);
  exitWithError(formatted, cliName);
};
```

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add src/errors.ts test/errors.test.ts
git commit -m "feat: add error formatting with colorful output"
```

---

## Task 6: Version Detection

**Files:**

- Create: `src/version.ts`
- Test: `test/version.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it } from 'node:test';
import { expect } from 'bupkis';
import { detectVersion } from '../src/version.js';

describe('version detection', () => {
  it('should return provided version if given', async () => {
    const version = await detectVersion('1.2.3');
    expect(version, 'to equal', '1.2.3');
  });

  it('should return undefined if no version and no package.json found', async () => {
    const version = await detectVersion(undefined, '/nonexistent/path');
    expect(version, 'to be undefined');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL with "Cannot find module '../src/version.js'"

**Step 3: Write minimal implementation**

```typescript
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/**
 * Find package.json by walking up from startDir.
 */
const findPackageJson = async (startDir: string): Promise<string | undefined> => {
  let dir = startDir;
  const root = dirname(dir);

  while (dir !== root) {
    const pkgPath = join(dir, 'package.json');
    try {
      await readFile(pkgPath, 'utf-8');
      return pkgPath;
    } catch {
      dir = dirname(dir);
    }
  }

  return undefined;
};

/**
 * Read version from package.json.
 */
const readVersionFromPackageJson = async (pkgPath: string): Promise<string | undefined> => {
  try {
    const content = await readFile(pkgPath, 'utf-8');
    const pkg = JSON.parse(content) as { version?: string };
    return pkg.version;
  } catch {
    return undefined;
  }
};

/**
 * Detect version: use provided version or read from nearest package.json.
 */
export const detectVersion = async (
  providedVersion: string | undefined,
  startDir: string = process.cwd(),
): Promise<string | undefined> => {
  if (providedVersion) {
    return providedVersion;
  }

  const pkgPath = await findPackageJson(startDir);
  if (!pkgPath) {
    return undefined;
  }

  return readVersionFromPackageJson(pkgPath);
};
```

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add src/version.ts test/version.test.ts
git commit -m "feat: add automatic version detection from package.json"
```

---

## Task 7: Core Parser - Simple CLI (No Commands)

**Files:**

- Create: `src/parser.ts`
- Test: `test/parser.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it } from 'node:test';
import { expect } from 'bupkis';
import { z } from 'zod';
import { parseSimple } from '../src/parser.js';

describe('parser', () => {
  describe('parseSimple', () => {
    it('should parse boolean flags', async () => {
      const schema = z.object({
        verbose: z.boolean().default(false),
      });
      const result = await parseSimple({
        options: schema,
        args: ['--verbose'],
      });
      expect(result.verbose, 'to be true');
    });

    it('should parse string options', async () => {
      const schema = z.object({
        output: z.string(),
      });
      const result = await parseSimple({
        options: schema,
        args: ['--output', 'file.txt'],
      });
      expect(result.output, 'to equal', 'file.txt');
    });

    it('should parse array options', async () => {
      const schema = z.object({
        files: z.string().array(),
      });
      const result = await parseSimple({
        options: schema,
        args: ['--files', 'a.txt', '--files', 'b.txt'],
      });
      expect(result.files, 'to equal', ['a.txt', 'b.txt']);
    });

    it('should apply aliases', async () => {
      const schema = z.object({
        verbose: z.boolean().default(false),
      });
      const result = await parseSimple({
        options: schema,
        aliases: { verbose: ['v'] },
        args: ['-v'],
      });
      expect(result.verbose, 'to be true');
    });

    it('should apply defaults', async () => {
      const schema = z.object({
        count: z.number().default(10),
      });
      const result = await parseSimple({
        options: schema,
        args: [],
      });
      expect(result.count, 'to equal', 10);
    });

    it('should merge user-provided defaults', async () => {
      const schema = z.object({
        output: z.string().optional(),
      });
      const result = await parseSimple({
        options: schema,
        defaults: { output: 'default.txt' },
        args: [],
      });
      expect(result.output, 'to equal', 'default.txt');
    });

    it('should let CLI args override defaults', async () => {
      const schema = z.object({
        output: z.string().optional(),
      });
      const result = await parseSimple({
        options: schema,
        defaults: { output: 'default.txt' },
        args: ['--output', 'override.txt'],
      });
      expect(result.output, 'to equal', 'override.txt');
    });

    it('should parse positionals', async () => {
      const schema = z.object({});
      const positionals = z.tuple([z.string(), z.string()]);
      const result = await parseSimple({
        options: schema,
        positionals,
        args: ['arg1', 'arg2'],
      });
      expect(result.positionals, 'to equal', ['arg1', 'arg2']);
    });

    it('should run transforms (middleware)', async () => {
      const schema = z
        .object({
          multiplier: z.coerce.number().default(1),
        })
        .transform((args) => ({
          ...args,
          computed: args.multiplier * 10,
        }));
      const result = await parseSimple({
        options: schema,
        args: ['--multiplier', '5'],
      });
      expect(result.computed, 'to equal', 50);
    });

    it('should throw on unknown options (strict mode)', async () => {
      const schema = z.object({
        verbose: z.boolean().default(false),
      });
      try {
        await parseSimple({
          options: schema,
          args: ['--unknown'],
        });
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as Error).message, 'to contain', 'unknown');
      }
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL with "Cannot find module '../src/parser.js'"

**Step 3: Write minimal implementation**

```typescript
import { parseArgs } from 'node:util';
import { z, type ZodObject, type ZodRawShape, type ZodTypeAny, type ZodTuple, type ZodArray } from 'zod';
import { extractParseArgsConfig } from './schema.js';
import type { Aliases } from './types.js';

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
  if (schema instanceof z.ZodEffects) {
    return getInnerObject(schema._def.schema as ZodObject<ZodRawShape>);
  }
  return schema;
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
    while (
      base instanceof z.ZodOptional ||
      base instanceof z.ZodNullable ||
      base instanceof z.ZodDefault
    ) {
      if (base instanceof z.ZodDefault) {
        base = base._def.innerType;
      } else {
        base = base.unwrap();
      }
    }

    // Coerce numbers
    if (base instanceof z.ZodNumber && typeof value === 'string') {
      result[key] = Number(value);
    }

    // Handle arrays of numbers
    if (base instanceof z.ZodArray && base.element instanceof z.ZodNumber && Array.isArray(value)) {
      result[key] = value.map((v) => (typeof v === 'string' ? Number(v) : v));
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
```

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add src/parser.ts test/parser.test.ts
git commit -m "feat: add core parser for simple CLI"
```

---

## Task 8: Command Parser

**Files:**

- Modify: `src/parser.ts`
- Test: `test/parser-commands.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it } from 'node:test';
import { expect } from 'bupkis';
import { z } from 'zod';
import { parseCommands } from '../src/parser.js';

describe('parseCommands', () => {
  it('should parse a command with its options', async () => {
    let handlerCalled = false;
    let receivedArgs: unknown;

    await parseCommands({
      name: 'mycli',
      globalOptions: z.object({
        verbose: z.boolean().default(false),
      }),
      commands: {
        add: {
          description: 'Add files',
          options: z.object({
            force: z.boolean().default(false),
          }),
          handler: async (args) => {
            handlerCalled = true;
            receivedArgs = args;
          },
        },
      },
      args: ['add', '--force'],
    });

    expect(handlerCalled, 'to be true');
    expect(receivedArgs, 'to satisfy', { force: true, verbose: false });
  });

  it('should merge global and command options', async () => {
    let receivedArgs: unknown;

    await parseCommands({
      name: 'mycli',
      globalOptions: z.object({
        verbose: z.boolean().default(false),
      }),
      globalAliases: { verbose: ['v'] },
      commands: {
        add: {
          description: 'Add files',
          options: z.object({
            force: z.boolean().default(false),
          }),
          handler: async (args) => {
            receivedArgs = args;
          },
        },
      },
      args: ['add', '-v', '--force'],
    });

    expect(receivedArgs, 'to satisfy', { verbose: true, force: true });
  });

  it('should run defaultHandler when no command given (string)', async () => {
    let addCalled = false;

    await parseCommands({
      name: 'mycli',
      globalOptions: z.object({}),
      commands: {
        add: {
          description: 'Add files',
          handler: async () => {
            addCalled = true;
          },
        },
      },
      defaultHandler: 'add',
      args: [],
    });

    expect(addCalled, 'to be true');
  });

  it('should run defaultHandler when no command given (function)', async () => {
    let defaultCalled = false;

    await parseCommands({
      name: 'mycli',
      globalOptions: z.object({}),
      commands: {
        add: {
          description: 'Add files',
          handler: async () => {},
        },
      },
      defaultHandler: async () => {
        defaultCalled = true;
      },
      args: [],
    });

    expect(defaultCalled, 'to be true');
  });

  it('should parse command positionals', async () => {
    let receivedArgs: unknown;

    await parseCommands({
      name: 'mycli',
      globalOptions: z.object({}),
      commands: {
        add: {
          description: 'Add files',
          positionals: z.string().array(),
          handler: async (args) => {
            receivedArgs = args;
          },
        },
      },
      args: ['add', 'file1.txt', 'file2.txt'],
    });

    expect(receivedArgs, 'to satisfy', { positionals: ['file1.txt', 'file2.txt'] });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL with "parseCommands is not exported"

**Step 3: Add implementation to `src/parser.ts`**

Append to `src/parser.ts`:

```typescript
import type { CommandBargsConfig, CommandConfig, Handler } from './types.js';

/**
 * Options for parseCommands.
 */
export interface ParseCommandsOptions {
  name: string;
  globalOptions?: ZodObject<ZodRawShape> | z.ZodEffects<ZodObject<ZodRawShape>>;
  globalAliases?: Aliases<ZodRawShape>;
  commands: Record<string, CommandConfig>;
  defaultHandler?: string | Handler<unknown>;
  args?: string[];
}

/**
 * Parse arguments for a command-based CLI.
 */
export const parseCommands = async (options: ParseCommandsOptions): Promise<void> => {
  const {
    name,
    globalOptions = z.object({}),
    globalAliases = {},
    commands,
    defaultHandler,
    args = process.argv.slice(2),
  } = options;

  // Extract command name (first non-flag argument)
  const commandIndex = args.findIndex((arg) => !arg.startsWith('-'));
  const commandName = commandIndex >= 0 ? args[commandIndex] : undefined;
  const remainingArgs = commandName
    ? [...args.slice(0, commandIndex), ...args.slice(commandIndex + 1)]
    : args;

  // If no command, use defaultHandler
  if (!commandName) {
    if (typeof defaultHandler === 'string') {
      // Run the default command
      const defaultCommand = commands[defaultHandler];
      if (!defaultCommand) {
        throw new Error(`Default command '${defaultHandler}' not found`);
      }
      return parseCommands({
        ...options,
        args: [defaultHandler, ...args],
        defaultHandler: undefined,
      });
    } else if (typeof defaultHandler === 'function') {
      // Run the default handler function
      const innerGlobal = getInnerObject(globalOptions);
      const parseArgsOptions = extractParseArgsConfig(innerGlobal, globalAliases);
      const { values } = parseArgs({
        args: remainingArgs,
        options: parseArgsOptions,
        strict: true,
        allowPositionals: false,
      });
      const coerced = coerceValues(values, innerGlobal);
      const validated = await globalOptions.parseAsync(coerced);
      await defaultHandler(validated);
      return;
    } else {
      throw new Error(`No command specified. Run '${name} --help' for usage.`);
    }
  }

  // Get command config
  const command = commands[commandName];
  if (!command) {
    throw new Error(`Unknown command: ${commandName}. Run '${name} --help' for usage.`);
  }

  // Build merged schema: global + command options
  const innerGlobal = getInnerObject(globalOptions);
  const commandOptions = command.options ?? z.object({});
  const innerCommand = getInnerObject(commandOptions);

  // Merge aliases
  const mergedAliases = { ...globalAliases, ...(command.aliases ?? {}) };

  // Build parseArgs config from both schemas
  const globalConfig = extractParseArgsConfig(innerGlobal, globalAliases);
  const commandConfig = extractParseArgsConfig(innerCommand, command.aliases ?? {});
  const mergedConfig = { ...globalConfig, ...commandConfig };

  // Parse
  const { values, positionals } = parseArgs({
    args: remainingArgs,
    options: mergedConfig,
    strict: true,
    allowPositionals: command.positionals !== undefined,
  });

  // Coerce and merge
  const coercedGlobal = coerceValues(values, innerGlobal);
  const coercedCommand = coerceValues(values, innerCommand);
  const merged = { ...coercedGlobal, ...coercedCommand };

  // Validate both schemas
  const validatedGlobal = await globalOptions.parseAsync(coercedGlobal);
  const validatedCommand = await commandOptions.parseAsync(coercedCommand);
  const validated = { ...validatedGlobal, ...validatedCommand };

  // Add positionals if schema provided
  if (command.positionals) {
    const validatedPositionals = await command.positionals.parseAsync(positionals);
    (validated as Record<string, unknown>).positionals = validatedPositionals;
  }

  // Run handler
  await command.handler(validated);
};
```

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add src/parser.ts test/parser-commands.test.ts
git commit -m "feat: add command parsing support"
```

---

## Task 9: Main Entry Point - bargs()

**Files:**

- Modify: `src/index.ts`
- Test: `test/bargs.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, mock } from 'node:test';
import { expect } from 'bupkis';
import { z } from 'zod';
import { bargs } from '../src/index.js';

describe('bargs', () => {
  it('should parse simple CLI and return args', async () => {
    const result = await bargs({
      name: 'mycli',
      options: z.object({
        verbose: z.boolean().default(false),
      }),
      args: ['--verbose'],
    });
    expect(result, 'to satisfy', { verbose: true });
  });

  it('should run handler and return void', async () => {
    let called = false;
    const result = await bargs({
      name: 'mycli',
      options: z.object({
        verbose: z.boolean().default(false),
      }),
      handler: async (args) => {
        called = true;
        expect(args.verbose, 'to be true');
      },
      args: ['--verbose'],
    });
    expect(called, 'to be true');
    expect(result, 'to be undefined');
  });

  it('should handle --help flag', async () => {
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => logs.push(args.join(' '));

    const exitMock = mock.fn(() => {
      throw new Error('EXIT');
    });
    const originalExit = process.exit;
    process.exit = exitMock as unknown as typeof process.exit;

    try {
      await bargs({
        name: 'mycli',
        description: 'A test CLI',
        options: z.object({
          verbose: z.boolean().default(false),
        }),
        args: ['--help'],
      });
    } catch (e) {
      expect((e as Error).message, 'to equal', 'EXIT');
    }

    console.log = originalLog;
    process.exit = originalExit;

    expect(logs.join('\n'), 'to contain', 'mycli');
    expect(logs.join('\n'), 'to contain', 'verbose');
  });

  it('should handle --version flag', async () => {
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => logs.push(args.join(' '));

    const exitMock = mock.fn(() => {
      throw new Error('EXIT');
    });
    const originalExit = process.exit;
    process.exit = exitMock as unknown as typeof process.exit;

    try {
      await bargs({
        name: 'mycli',
        version: '1.2.3',
        options: z.object({}),
        args: ['--version'],
      });
    } catch (e) {
      expect((e as Error).message, 'to equal', 'EXIT');
    }

    console.log = originalLog;
    process.exit = originalExit;

    expect(logs.join('\n'), 'to contain', '1.2.3');
  });

  it('should run command handler', async () => {
    let called = false;
    await bargs({
      name: 'mycli',
      globalOptions: z.object({}),
      commands: {
        test: {
          description: 'Test command',
          handler: async () => {
            called = true;
          },
        },
      },
      args: ['test'],
    });
    expect(called, 'to be true');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL with "bargs is not exported" or similar

**Step 3: Write implementation in `src/index.ts`**

```typescript
import { z, type ZodObject, type ZodRawShape, type ZodTypeAny, type ZodTuple, type ZodArray } from 'zod';
import { parseSimple, parseCommands } from './parser.js';
import { generateHelp, generateCommandHelp } from './help.js';
import { exitWithZodError } from './errors.js';
import { detectVersion } from './version.js';
import type {
  SimpleBargsConfig,
  CommandBargsConfig,
  BargsConfig,
  Aliases,
  Handler,
  CommandConfig,
} from './types.js';

export * from './types.js';
export * from './ansi.js';
export * from './errors.js';
export * from './help.js';
export * from './schema.js';

/**
 * Check if config has commands.
 */
const hasCommands = (config: BargsConfig): config is CommandBargsConfig => {
  return 'commands' in config && config.commands !== undefined;
};

/**
 * Check for --help or --version flags.
 */
const checkBuiltinFlags = async (
  args: string[],
  config: BargsConfig,
): Promise<boolean> => {
  if (args.includes('--help') || args.includes('-h')) {
    // Check if it's command-specific help
    if (hasCommands(config)) {
      const commandIndex = args.findIndex((arg) => !arg.startsWith('-') && arg !== '--help' && arg !== '-h');
      if (commandIndex >= 0) {
        const commandName = args[commandIndex];
        if (config.commands[commandName]) {
          console.log(generateCommandHelp(config as CommandBargsConfig, commandName));
          process.exit(0);
        }
      }
    }
    console.log(generateHelp(config));
    process.exit(0);
  }

  if (args.includes('--version') || args.includes('-V')) {
    const version = await detectVersion(config.version);
    console.log(version ?? 'unknown');
    process.exit(0);
  }

  return false;
};

/**
 * Main bargs function.
 */
export async function bargs<
  TOptions extends ZodObject<ZodRawShape> | z.ZodEffects<ZodObject<ZodRawShape>>,
  TPositionals extends ZodTuple | ZodArray<ZodTypeAny> | undefined = undefined,
>(
  config: SimpleBargsConfig<
    TOptions extends z.ZodEffects<infer I> ? (I extends ZodObject<ZodRawShape> ? I : never) : TOptions,
    TPositionals
  > & { options: TOptions },
): Promise<
  SimpleBargsConfig<
    TOptions extends z.ZodEffects<infer I> ? (I extends ZodObject<ZodRawShape> ? I : never) : TOptions,
    TPositionals
  >['handler'] extends Handler<unknown>
    ? void
    : z.infer<TOptions> & (TPositionals extends ZodTypeAny ? { positionals: z.infer<TPositionals> } : object)
>;

export async function bargs(config: CommandBargsConfig): Promise<void>;

export async function bargs(config: BargsConfig): Promise<unknown> {
  const args = config.args ?? process.argv.slice(2);

  // Check for --help and --version
  await checkBuiltinFlags(args, config);

  try {
    if (hasCommands(config)) {
      await parseCommands({
        name: config.name,
        globalOptions: config.globalOptions,
        globalAliases: config.globalAliases,
        commands: config.commands,
        defaultHandler: config.defaultHandler,
        args,
      });
      return;
    }

    // Simple CLI
    const simpleConfig = config as SimpleBargsConfig;
    const result = await parseSimple({
      options: simpleConfig.options ?? z.object({}),
      positionals: simpleConfig.positionals,
      aliases: simpleConfig.aliases,
      defaults: simpleConfig.defaults,
      args,
    });

    if (simpleConfig.handler) {
      await simpleConfig.handler(result);
      return;
    }

    return result;
  } catch (error) {
    if (error instanceof z.ZodError) {
      exitWithZodError(error, config.name);
    }
    throw error;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add src/index.ts test/bargs.test.ts
git commit -m "feat: add main bargs() entry point with help and version support"
```

---

## Task 10: Delete Placeholder Test

**Files:**

- Delete: `test/index.test.ts` (the placeholder)

**Step 1: Delete the placeholder test file**

Run: `rm test/index.test.ts`

**Step 2: Run tests to verify nothing broke**

Run: `npm test`
Expected: PASS (all real tests pass)

**Step 3: Commit**

```bash
git add -u test/index.test.ts
git commit -m "chore: remove placeholder test"
```

---

## Task 11: Update Package Metadata

**Files:**

- Modify: `package.json`

**Step 1: Update package.json with correct metadata**

Update the following fields:

- `name`: `"bargs"`
- `description`: `"A TypeScript-first CLI argument parser wrapping util.parseArgs() with Zod schema validation"`
- `repository.url`: `"git+https://github.com/boneskull/bargs.git"`
- `keywords`: `["cli", "args", "arguments", "parser", "zod", "typescript", "parseArgs"]`
- `private`: `false`

**Step 2: Run build and lint**

Run: `npm run build && npm run lint`
Expected: PASS

**Step 3: Commit**

```bash
git add package.json
git commit -m "chore: update package metadata for bargs"
```

---

## Task 12: Final Integration Test

**Files:**

- Create: `test/integration.test.ts`

**Step 1: Write integration test**

```typescript
import { describe, it, mock } from 'node:test';
import { expect } from 'bupkis';
import { z } from 'zod';
import { bargs } from '../src/index.js';

describe('integration', () => {
  it('should handle a complete CLI workflow', async () => {
    const actions: string[] = [];

    await bargs({
      name: 'mycli',
      description: 'A complete test CLI',
      version: '1.0.0',
      globalOptions: z
        .object({
          verbose: z.boolean().default(false).meta({ description: 'Enable verbose output' }),
          config: z.string().optional().meta({ description: 'Config file path' }),
        })
        .transform((args) => {
          if (args.verbose) {
            actions.push('verbose enabled');
          }
          return args;
        }),
      globalAliases: { verbose: ['v'], config: ['c'] },
      commands: {
        add: {
          description: 'Add files to staging',
          options: z.object({
            force: z.boolean().default(false).meta({ description: 'Force add' }),
          }),
          aliases: { force: ['f'] },
          positionals: z.string().array().meta({ description: 'Files to add' }),
          handler: async (args) => {
            actions.push(`add: force=${args.force}, files=${args.positionals.join(',')}`);
          },
        },
        commit: {
          description: 'Commit staged changes',
          options: z.object({
            message: z.string().meta({ description: 'Commit message' }),
          }),
          aliases: { message: ['m'] },
          handler: async (args) => {
            actions.push(`commit: message=${args.message}`);
          },
        },
      },
      args: ['-v', 'add', '-f', 'file1.txt', 'file2.txt'],
    });

    expect(actions, 'to contain', 'verbose enabled');
    expect(actions, 'to contain', 'add: force=true, files=file1.txt,file2.txt');
  });

  it('should handle simple CLI with transforms', async () => {
    const result = await bargs({
      name: 'simple',
      options: z
        .object({
          count: z.coerce.number().default(1),
        })
        .transform(async (args) => ({
          ...args,
          doubled: args.count * 2,
        })),
      args: ['--count', '5'],
    });

    expect(result.count, 'to equal', 5);
    expect(result.doubled, 'to equal', 10);
  });

  it('should apply config file defaults', async () => {
    // Simulate loading from config file
    const configFileDefaults = {
      output: 'from-config.txt',
      verbose: true,
    };

    const result = await bargs({
      name: 'withconfig',
      options: z.object({
        output: z.string().optional(),
        verbose: z.boolean().default(false),
        format: z.string().default('json'),
      }),
      defaults: configFileDefaults,
      args: ['--format', 'yaml'], // Override format from CLI
    });

    expect(result.output, 'to equal', 'from-config.txt'); // From config
    expect(result.verbose, 'to be true'); // From config
    expect(result.format, 'to equal', 'yaml'); // CLI override
  });
});
```

**Step 2: Run test**

Run: `npm test`
Expected: PASS

**Step 3: Run full lint and build**

Run: `npm run lint && npm run build`
Expected: PASS

**Step 4: Commit**

```bash
git add test/integration.test.ts
git commit -m "test: add integration tests for complete CLI workflows"
```

---

## Summary

After completing all tasks, you will have:

1. **Core types** (`src/types.ts`) - TypeScript definitions for all config shapes
2. **ANSI utilities** (`src/ansi.ts`) - Zero-dependency color helpers
3. **Schema introspection** (`src/schema.ts`) - Extract parseArgs config from Zod schemas
4. **Help generation** (`src/help.ts`) - Colorful, grouped help text
5. **Error formatting** (`src/errors.ts`) - Pretty Zod error display
6. **Version detection** (`src/version.ts`) - Auto-detect from package.json
7. **Parser** (`src/parser.ts`) - Core parsing for simple and command CLIs
8. **Main entry** (`src/index.ts`) - The `bargs()` function with all integrations

The library supports:
- Simple CLIs (no commands) with optional handlers
- Command-based CLIs with global options
- Zod transforms as middleware
- Automatic `--help` and `--version`
- Colorful, grouped help output
- Pretty error messages
- Config file defaults (user-provided)
- Type-safe throughout
