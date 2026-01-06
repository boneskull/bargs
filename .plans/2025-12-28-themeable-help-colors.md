# Themeable Help Colors Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make bargs help output customizable with themeable ANSI colors, allowing users to choose built-in themes or define custom color schemes.

**Architecture:** Create a `Theme` type defining colors for each semantic element of help output (flags, positionals, descriptions, section headers, etc.). Ship several built-in themes accessible by name. The `bargs()` API accepts an optional second parameter (`BargsOptions`) containing runtime options like `theme`. This separates parsing config (first param) from runtime behavior (second param). The help generator receives theme context and applies colors via a new theming abstraction layer.

**Tech Stack:** TypeScript 5.x, Node.js ANSI escape codes, no runtime dependencies

---

## Part 1: Define Theme Types

### Task 1: Create Theme Type Definitions

**Files:**

- Create: `src/theme.ts`

**Step 1: Write the failing test**

Create a test file that imports the theme types and checks basic structure:

```typescript
// test/theme.test.ts
import { describe, expect, it } from 'vitest';
import type { Theme, ThemeColors } from '../src/theme.js';
import { themes, getTheme, defaultTheme } from '../src/theme.js';

describe('Theme', () => {
  it('should export themes object with default and mono themes', () => {
    expect(themes).toHaveProperty('default');
    expect(themes).toHaveProperty('mono');
  });

  it('should have defaultTheme matching themes.default', () => {
    expect(defaultTheme).toBe(themes.default);
  });

  it('getTheme returns theme by name', () => {
    expect(getTheme('default')).toBe(themes.default);
    expect(getTheme('mono')).toBe(themes.mono);
  });

  it('getTheme returns custom theme object as-is', () => {
    const custom: Theme = {
      colors: {
        scriptName: '\x1b[35m',
        command: '\x1b[34m',
        flag: '\x1b[36m',
        positional: '\x1b[33m',
        description: '',
        sectionHeader: '\x1b[33m',
        type: '\x1b[36m',
        defaultValue: '\x1b[2m',
        usage: '',
        example: '\x1b[2m',
      },
    };
    expect(getTheme(custom)).toBe(custom);
  });

  it('mono theme has all colors as empty strings', () => {
    const mono = themes.mono;
    for (const value of Object.values(mono.colors)) {
      expect(value).toBe('');
    }
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- test/theme.test.ts`
Expected: FAIL with "Cannot find module '../src/theme.js'"

**Step 3: Write the theme types and built-in themes**

```typescript
// src/theme.ts

/**
 * Color codes for each semantic element in help output. Empty string means no
 * color (passthrough).
 */
export interface ThemeColors {
  /** CLI name shown in header (e.g., "myapp") */
  scriptName: string;
  /** Command names (e.g., "init", "build") */
  command: string;
  /** Flag names (e.g., "--verbose", "-v") */
  flag: string;
  /** Positional argument names (e.g., "<file>") */
  positional: string;
  /** Description text for options/commands */
  description: string;
  /** Section headers (e.g., "USAGE", "OPTIONS") */
  sectionHeader: string;
  /** Type annotations (e.g., "[string]", "[number]") */
  type: string;
  /** Default value annotations (e.g., "default: false") */
  defaultValue: string;
  /** Usage line text */
  usage: string;
  /** Example code/commands */
  example: string;
}

/**
 * A bargs color theme.
 */
export interface Theme {
  colors: ThemeColors;
}

/**
 * Theme input - either a theme name or a custom Theme object.
 */
export type ThemeInput = keyof typeof themes | Theme;

/**
 * ANSI escape codes.
 */
const ansi = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  brightBlack: '\x1b[90m',
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
} as const;

/**
 * Built-in themes.
 */
export const themes = {
  /** Default colorful theme */
  default: {
    colors: {
      scriptName: ansi.bold,
      command: ansi.bold,
      flag: ansi.cyan,
      positional: ansi.yellow,
      description: '',
      sectionHeader: ansi.yellow,
      type: ansi.cyan,
      defaultValue: ansi.dim,
      usage: '',
      example: ansi.dim,
    },
  },

  /** No colors (monochrome) */
  mono: {
    colors: {
      scriptName: '',
      command: '',
      flag: '',
      positional: '',
      description: '',
      sectionHeader: '',
      type: '',
      defaultValue: '',
      usage: '',
      example: '',
    },
  },

  /** Ocean theme - blues and greens */
  ocean: {
    colors: {
      scriptName: ansi.bold + ansi.blue,
      command: ansi.bold + ansi.cyan,
      flag: ansi.brightCyan,
      positional: ansi.green,
      description: '',
      sectionHeader: ansi.blue,
      type: ansi.brightBlue,
      defaultValue: ansi.dim,
      usage: '',
      example: ansi.dim,
    },
  },

  /** Warm theme - reds and yellows */
  warm: {
    colors: {
      scriptName: ansi.bold + ansi.red,
      command: ansi.bold + ansi.yellow,
      flag: ansi.brightYellow,
      positional: ansi.brightRed,
      description: '',
      sectionHeader: ansi.red,
      type: ansi.yellow,
      defaultValue: ansi.dim,
      usage: '',
      example: ansi.dim,
    },
  },
} as const satisfies Record<string, Theme>;

/**
 * Default theme export for convenience.
 */
export const defaultTheme: Theme = themes.default;

/**
 * Resolve a theme input to a Theme object.
 */
export const getTheme = (input: ThemeInput): Theme => {
  if (typeof input === 'string') {
    return themes[input];
  }
  return input;
};
```

**Step 4: Run test to verify it passes**

Run: `npm test -- test/theme.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/theme.ts test/theme.test.ts
git commit -m "feat(theme): add theme types and built-in themes

- Define ThemeColors interface with semantic color slots
- Add Theme type and ThemeInput union type
- Create built-in themes: default, mono, ocean, warm
- Export getTheme() resolver function"
```

---

## Part 2: Create Theme-Aware Styling Functions

### Task 2: Create Themed Styler Utility

**Files:**

- Modify: `src/theme.ts`

**Step 1: Write the failing test**

Add tests for the styler creation:

```typescript
// Add to test/theme.test.ts

import { createStyler, type Styler } from '../src/theme.js';

describe('createStyler', () => {
  it('creates styler from default theme', () => {
    const styler = createStyler(themes.default);
    expect(typeof styler.scriptName).toBe('function');
    expect(typeof styler.flag).toBe('function');
  });

  it('applies color codes with default theme', () => {
    const styler = createStyler(themes.default);
    const result = styler.sectionHeader('OPTIONS');
    expect(result).toContain('\x1b[33m'); // yellow
    expect(result).toContain('OPTIONS');
    expect(result).toContain('\x1b[0m'); // reset
  });

  it('passes through text with mono theme', () => {
    const styler = createStyler(themes.mono);
    const result = styler.sectionHeader('OPTIONS');
    expect(result).toBe('OPTIONS');
  });

  it('applies bold styling for scriptName', () => {
    const styler = createStyler(themes.default);
    const result = styler.scriptName('myapp');
    expect(result).toContain('\x1b[1m'); // bold
    expect(result).toContain('myapp');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- test/theme.test.ts`
Expected: FAIL with "createStyler is not exported"

**Step 3: Add createStyler function**

Add to `src/theme.ts`:

```typescript
/**
 * Style function that wraps text with ANSI codes.
 */
export type StyleFn = (text: string) => string;

/**
 * Styler object with methods for each semantic element.
 */
export interface Styler {
  scriptName: StyleFn;
  command: StyleFn;
  flag: StyleFn;
  positional: StyleFn;
  description: StyleFn;
  sectionHeader: StyleFn;
  type: StyleFn;
  defaultValue: StyleFn;
  usage: StyleFn;
  example: StyleFn;
}

/**
 * ANSI reset code.
 */
const RESET = '\x1b[0m';

/**
 * Create a style function from a color code. Returns passthrough if color is
 * empty.
 */
const makeStyleFn = (color: string): StyleFn => {
  if (!color) {
    return (text: string) => text;
  }
  return (text: string) => `${color}${text}${RESET}`;
};

/**
 * Create a Styler from a Theme.
 */
export const createStyler = (theme: Theme): Styler => ({
  scriptName: makeStyleFn(theme.colors.scriptName),
  command: makeStyleFn(theme.colors.command),
  flag: makeStyleFn(theme.colors.flag),
  positional: makeStyleFn(theme.colors.positional),
  description: makeStyleFn(theme.colors.description),
  sectionHeader: makeStyleFn(theme.colors.sectionHeader),
  type: makeStyleFn(theme.colors.type),
  defaultValue: makeStyleFn(theme.colors.defaultValue),
  usage: makeStyleFn(theme.colors.usage),
  example: makeStyleFn(theme.colors.example),
});
```

**Step 4: Run test to verify it passes**

Run: `npm test -- test/theme.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/theme.ts test/theme.test.ts
git commit -m "feat(theme): add createStyler function

- Create StyleFn type for text wrapping
- Add Styler interface with methods for each element
- Implement createStyler() to generate stylers from themes
- Handle passthrough for empty color codes"
```

---

## Part 3: Update Help Generator to Use Themes

### Task 3: Update generateHelp to Accept Theme

**Files:**

- Modify: `src/help.ts`
- Modify: `test/help.test.ts`

**Step 1: Write the failing test**

```typescript
// Add to test/help.test.ts

import { themes } from '../src/theme.js';

describe('generateHelp with themes', () => {
  it('uses default theme when no theme provided', () => {
    const config = {
      name: 'test-app',
      description: 'A test application',
      options: {
        verbose: { type: 'boolean' as const, description: 'Verbose output' },
      },
    };
    const help = generateHelp(config);
    // Should have yellow section headers (default theme)
    expect(help).toContain('\x1b[33m'); // yellow for USAGE
  });

  it('uses mono theme for no colors', () => {
    const config = {
      name: 'test-app',
      options: {
        verbose: { type: 'boolean' as const, description: 'Verbose output' },
      },
    };
    const help = generateHelp(config, themes.mono);
    // Should have no ANSI codes
    expect(help).not.toContain('\x1b[');
  });

  it('applies custom theme colors', () => {
    const customTheme = {
      colors: {
        scriptName: '\x1b[35m', // magenta
        command: '',
        flag: '',
        positional: '',
        description: '',
        sectionHeader: '\x1b[34m', // blue
        type: '',
        defaultValue: '',
        usage: '',
        example: '',
      },
    };
    const config = {
      name: 'test-app',
      options: {},
    };
    const help = generateHelp(config, customTheme);
    expect(help).toContain('\x1b[35m'); // magenta script name
    expect(help).toContain('\x1b[34m'); // blue section header
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- test/help.test.ts`
Expected: FAIL - generateHelp doesn't accept second argument

**Step 3: Update generateHelp signature and implementation**

```typescript
// src/help.ts
import type {
  BargsConfig,
  BargsConfigWithCommands,
  CommandConfigInput,
  OptionDef,
  OptionsSchema,
  PositionalsSchema,
} from './types.js';

import {
  createStyler,
  defaultTheme,
  type Styler,
  type Theme,
} from './theme.js';

/**
 * Get type label for help display.
 */
const getTypeLabel = (def: OptionDef): string => {
  switch (def.type) {
    case 'array':
      return `${def.items}[]`;
    case 'boolean':
      return 'boolean';
    case 'count':
      return 'count';
    case 'enum':
      return def.choices.join(' | ');
    case 'number':
      return 'number';
    case 'string':
      return 'string';
    default:
      return 'string';
  }
};

/**
 * Format a single option for help output.
 */
const formatOptionHelp = (
  name: string,
  def: OptionDef,
  styler: Styler,
): string => {
  const parts: string[] = [];

  // Build flag string: -v, --verbose
  const shortAlias = def.aliases?.find((a) => a.length === 1);
  const flagText = shortAlias ? `-${shortAlias}, --${name}` : `    --${name}`;
  parts.push(`  ${styler.flag(flagText)}`);

  // Pad to align descriptions
  const padding = Math.max(0, 24 - flagText.length - 2);
  parts.push(' '.repeat(padding));

  // Description
  if (def.description) {
    parts.push(styler.description(def.description));
  }

  // Type and default
  const typeLabel = getTypeLabel(def);
  const suffixParts = [styler.type(`[${typeLabel}]`)];
  if ('default' in def && def.default !== undefined) {
    suffixParts.push(
      styler.defaultValue(`default: ${JSON.stringify(def.default)}`),
    );
  }

  parts.push('  ', suffixParts.join(' '));

  return parts.join('');
};

/**
 * Check if config has commands.
 */
const hasCommands = <
  T extends { commands?: Record<string, CommandConfigInput> },
>(
  config: T,
): config is T & { commands: Record<string, CommandConfigInput> } =>
  config.commands !== undefined && Object.keys(config.commands).length > 0;

/**
 * Generate help text for a bargs config.
 */
export const generateHelp = <
  TOptions extends OptionsSchema = OptionsSchema,
  TPositionals extends PositionalsSchema = PositionalsSchema,
  TCommands extends Record<string, CommandConfigInput> | undefined = undefined,
>(
  config: BargsConfig<TOptions, TPositionals, TCommands>,
  theme: Theme = defaultTheme,
): string => {
  const styler = createStyler(theme);
  const lines: string[] = [];

  // Header
  const version = config.version ? ` v${config.version}` : '';
  lines.push('');
  lines.push(
    `  ${styler.scriptName(config.name)}${styler.defaultValue(version)}`,
  );
  if (config.description) {
    lines.push(`  ${styler.description(config.description)}`);
  }
  lines.push('');

  // Usage
  lines.push(styler.sectionHeader('USAGE'));
  if (hasCommands(config)) {
    lines.push(styler.usage(`  $ ${config.name} <command> [options]`));
  } else {
    lines.push(styler.usage(`  $ ${config.name} [options]`));
  }
  lines.push('');

  // Commands
  if (hasCommands(config)) {
    lines.push(styler.sectionHeader('COMMANDS'));
    for (const [name, cmd] of Object.entries(config.commands)) {
      const padding = Math.max(0, 14 - name.length);
      lines.push(
        `  ${styler.command(name)}${' '.repeat(padding)}${styler.description(cmd.description)}`,
      );
    }
    lines.push('');
  }

  // Options
  if (config.options && Object.keys(config.options).length > 0) {
    // Group options
    const groups = new Map<string, Array<{ def: OptionDef; name: string }>>();
    const ungrouped: Array<{ def: OptionDef; name: string }> = [];

    for (const [name, def] of Object.entries(config.options)) {
      if (def.hidden) {
        continue;
      }

      if (def.group) {
        const group = groups.get(def.group) ?? [];
        group.push({ def, name });
        groups.set(def.group, group);
      } else {
        ungrouped.push({ def, name });
      }
    }

    // Print grouped options
    for (const [groupName, options] of Array.from(groups.entries())) {
      lines.push(styler.sectionHeader(groupName.toUpperCase()));
      for (const opt of options) {
        lines.push(formatOptionHelp(opt.name, opt.def, styler));
      }
      lines.push('');
    }

    // Print ungrouped
    if (ungrouped.length > 0) {
      const label = hasCommands(config) ? 'GLOBAL OPTIONS' : 'OPTIONS';
      lines.push(styler.sectionHeader(label));
      for (const opt of ungrouped) {
        lines.push(formatOptionHelp(opt.name, opt.def, styler));
      }
      lines.push('');
    }
  }

  // Footer
  if (hasCommands(config)) {
    lines.push(
      styler.example(
        `Run '${config.name} <command> --help' for command-specific help.`,
      ),
    );
    lines.push('');
  }

  return lines.join('\n');
};

/**
 * Generate help text for a specific command.
 */
export const generateCommandHelp = <
  TOptions extends OptionsSchema = OptionsSchema,
  TCommands extends Record<string, CommandConfigInput> = Record<
    string,
    CommandConfigInput
  >,
>(
  config: BargsConfigWithCommands<TOptions, TCommands>,
  commandName: string,
  theme: Theme = defaultTheme,
): string => {
  const styler = createStyler(theme);
  const commandsRecord = config.commands as Record<string, CommandConfigInput>;
  const command = commandsRecord[commandName];
  if (!command) {
    return `Unknown command: ${commandName}`;
  }

  const lines: string[] = [];

  // Header
  lines.push('');
  lines.push(
    `  ${styler.scriptName(config.name)} ${styler.command(commandName)}`,
  );
  lines.push(`  ${styler.description(command.description)}`);
  lines.push('');

  // Usage
  lines.push(styler.sectionHeader('USAGE'));
  lines.push(styler.usage(`  $ ${config.name} ${commandName} [options]`));
  lines.push('');

  // Command options
  if (command.options && Object.keys(command.options).length > 0) {
    lines.push(styler.sectionHeader('OPTIONS'));
    for (const [name, def] of Object.entries(command.options)) {
      if (def.hidden) {
        continue;
      }
      lines.push(formatOptionHelp(name, def, styler));
    }
    lines.push('');
  }

  // Global options
  if (config.options && Object.keys(config.options).length > 0) {
    lines.push(styler.sectionHeader('GLOBAL OPTIONS'));
    for (const [name, def] of Object.entries(config.options)) {
      if (def.hidden) {
        continue;
      }
      lines.push(formatOptionHelp(name, def, styler));
    }
    lines.push('');
  }

  return lines.join('\n');
};
```

**Step 4: Run test to verify it passes**

Run: `npm test -- test/help.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/help.ts test/help.test.ts
git commit -m "feat(help): add theme support to help generators

- Update generateHelp to accept optional theme parameter
- Update generateCommandHelp to accept optional theme parameter
- Replace hardcoded ANSI functions with styler calls
- Default to defaultTheme when no theme provided"
```

---

## Part 4: Wire Theme Through bargs() API

### Task 4: Create BargsOptions Type for Runtime Options

**Files:**

- Modify: `src/types.ts`

**Step 1: Write the failing test**

```typescript
// Add to test/bargs.test.ts

import { themes, type Theme, type BargsOptions } from '../src/index.js';

describe('bargs with options (second parameter)', () => {
  it('accepts theme by name in options', async () => {
    const result = await bargs(
      {
        name: 'test',
        args: ['--foo', 'bar'],
        options: { foo: { type: 'string' } },
      },
      { theme: 'mono' },
    );
    expect(result.values.foo).toBe('bar');
  });

  it('accepts custom theme object in options', async () => {
    const customTheme: Theme = {
      colors: {
        scriptName: '\x1b[35m',
        command: '',
        flag: '',
        positional: '',
        description: '',
        sectionHeader: '',
        type: '',
        defaultValue: '',
        usage: '',
        example: '',
      },
    };
    const result = await bargs(
      {
        name: 'test',
        args: ['--foo', 'bar'],
        options: { foo: { type: 'string' } },
      },
      { theme: customTheme },
    );
    expect(result.values.foo).toBe('bar');
  });

  it('works without options parameter', async () => {
    const result = await bargs({
      name: 'test',
      args: ['--foo', 'bar'],
      options: { foo: { type: 'string' } },
    });
    expect(result.values.foo).toBe('bar');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- test/bargs.test.ts`
Expected: FAIL - bargs doesn't accept second argument, BargsOptions not exported

**Step 3: Create BargsOptions type**

Add to `src/types.ts`:

```typescript
import type { ThemeInput } from './theme.js';

/**
 * Runtime options for bargs (separate from parsing config).
 */
export interface BargsOptions {
  /** Color theme for help output */
  theme?: ThemeInput;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- test/bargs.test.ts`
Expected: FAIL - still need to update bargs() signature (Task 5)

**Step 5: Commit**

```bash
git add src/types.ts
git commit -m "feat(types): add BargsOptions type for runtime options

- Create BargsOptions interface with theme property
- Separates parsing config from runtime behavior
- Enables future runtime options without polluting config"
```

---

### Task 5: Wire Theme Through bargs() Function

**Files:**

- Modify: `src/bargs.ts`

**Step 1: Write the failing test**

```typescript
// Add to test/bargs.test.ts

describe('bargs help with theme', () => {
  it('uses mono theme for --help when configured', async () => {
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => logs.push(msg);

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });

    try {
      await bargs(
        {
          name: 'test',
          args: ['--help'],
          options: { verbose: { type: 'boolean', description: 'Be verbose' } },
        },
        { theme: 'mono' },
      );
    } catch {
      // Expected exit
    }

    console.log = originalLog;
    exitSpy.mockRestore();

    const helpOutput = logs.join('\n');
    // Mono theme should have no ANSI codes
    expect(helpOutput).not.toContain('\x1b[');
    expect(helpOutput).toContain('USAGE');
    expect(helpOutput).toContain('--verbose');
  });

  it('uses default theme when no options provided', async () => {
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => logs.push(msg);

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });

    try {
      await bargs({
        name: 'test',
        args: ['--help'],
        options: { verbose: { type: 'boolean', description: 'Be verbose' } },
      });
    } catch {
      // Expected exit
    }

    console.log = originalLog;
    exitSpy.mockRestore();

    const helpOutput = logs.join('\n');
    // Default theme should have ANSI codes
    expect(helpOutput).toContain('\x1b[');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- test/bargs.test.ts`
Expected: FAIL - bargs doesn't accept second argument

**Step 3: Update bargs() signature to accept second parameter**

Update `src/bargs.ts`:

```typescript
import type { BargsOptions } from './types.js';
import { getTheme, type Theme } from './theme.js';

/**
 * Main bargs entry point for simple CLIs (no commands).
 */
export async function bargs<
  TOptions extends OptionsSchema,
  TPositionals extends PositionalsSchema,
>(
  config: BargsConfig<TOptions, TPositionals, undefined>,
  options?: BargsOptions,
): Promise<
  BargsResult<InferOptions<TOptions>, InferPositionals<TPositionals>, undefined>
>;

/**
 * Main bargs entry point for command-based CLIs.
 */
export async function bargs<
  TOptions extends OptionsSchema,
  TCommands extends Record<string, CommandConfigInput>,
>(
  config: BargsConfigWithCommands<TOptions, TCommands>,
  options?: BargsOptions,
): Promise<BargsResult<InferOptions<TOptions>, unknown[], string | undefined>>;

/**
 * Main bargs entry point (implementation).
 */
export async function bargs(
  config: BargsConfig<
    OptionsSchema,
    PositionalsSchema,
    Record<string, CommandConfigInput> | undefined
  >,
  options?: BargsOptions,
): Promise<BargsResult<unknown, unknown[], string | undefined>> {
  const args = config.args ?? process.argv.slice(2);
  const theme: Theme = options?.theme
    ? getTheme(options.theme)
    : getTheme('default');

  try {
    // Handle --help
    if (args.includes('--help') || args.includes('-h')) {
      if (hasCommands(config)) {
        // Check for command-specific help: cmd --help
        const helpIndex = args.findIndex((a) => a === '--help' || a === '-h');
        const commandIndex = args.findIndex((a) => !a.startsWith('-'));

        if (commandIndex >= 0 && commandIndex < helpIndex) {
          const commandName = args[commandIndex]!;
          console.log(generateCommandHelp(config, commandName, theme));
        } else {
          console.log(generateHelp(config, theme));
        }
      } else {
        console.log(
          generateHelp(
            config as BargsConfig<OptionsSchema, PositionalsSchema, undefined>,
            theme,
          ),
        );
      }
      process.exit(0);
    }

    // Handle --version
    if (args.includes('--version') && config.version) {
      console.log(config.version);
      process.exit(0);
    }

    // Parse
    if (hasCommands(config)) {
      return await parseCommands({ ...config, args });
    } else {
      const result = await parseSimple({
        args,
        options: config.options,
        positionals: config.positionals,
      });

      // Call handler(s) if provided
      if (config.handler) {
        await runHandlers(config.handler, result);
      }

      return result;
    }
  } catch (error) {
    if (error instanceof HelpError) {
      console.error(error.message);
      if (hasCommands(config)) {
        console.log(generateHelp(config, theme));
      } else {
        console.log(
          generateHelp(
            config as BargsConfig<OptionsSchema, PositionalsSchema, undefined>,
            theme,
          ),
        );
      }
      process.exit(1);
    }
    throw error;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- test/bargs.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/bargs.ts test/bargs.test.ts
git commit -m "feat(bargs): add second parameter for runtime options

- Add optional BargsOptions second parameter to bargs()
- Resolve theme from options or default to 'default'
- Pass resolved theme to generateHelp and generateCommandHelp
- Apply theme in error handler help output
- Keeps parsing config (1st param) separate from runtime options (2nd param)"
```

---

## Part 5: Export Theme Types and Utilities

### Task 6: Update Public Exports

**Files:**

- Modify: `src/index.ts`

**Step 1: Write the failing test**

```typescript
// test/exports.test.ts
import { describe, expect, it } from 'vitest';

describe('public exports', () => {
  it('exports theme utilities', async () => {
    const bargs = await import('../src/index.js');
    expect(bargs.themes).toBeDefined();
    expect(bargs.getTheme).toBeDefined();
    expect(bargs.createStyler).toBeDefined();
    expect(bargs.defaultTheme).toBeDefined();
  });

  it('exports theme types', async () => {
    // Type-only test - if this compiles, types are exported
    const { themes } = await import('../src/index.js');
    const _theme: import('../src/theme.js').Theme = themes.default;
    const _colors: import('../src/theme.js').ThemeColors =
      themes.default.colors;
  });

  it('exports BargsOptions type', async () => {
    // Type-only test - if this compiles, BargsOptions is exported
    const _opts: import('../src/types.js').BargsOptions = { theme: 'mono' };
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- test/exports.test.ts`
Expected: FAIL - theme exports not found

**Step 3: Add theme exports to index.ts**

```typescript
// src/index.ts - Main entry point for bargs

import { bargs as parseAsync } from './bargs.js';
import { opt } from './opt.js';

export const bargs = Object.assign(parseAsync, opt);

export default bargs;

// Re-export errors
export { BargsError, HelpError } from './errors.js';

// Re-export help generators
export { generateCommandHelp, generateHelp } from './help.js';

// Re-export theme utilities
export { createStyler, defaultTheme, getTheme, themes } from './theme.js';

// Re-export theme types
export type {
  Styler,
  StyleFn,
  Theme,
  ThemeColors,
  ThemeInput,
} from './theme.js';

// Re-export the opt builder and parseAsync function
export { opt, parseAsync };

// Re-export all types
export type {
  AnyCommandConfig,
  ArrayOption,
  BargsConfig,
  BargsConfigWithCommands,
  BargsOptions,
  BargsResult,
  BooleanOption,
  CommandConfig,
  CommandConfigInput,
  CountOption,
  EnumOption,
  Handler,
  HandlerFn,
  InferOption,
  InferOptions,
  InferPositional,
  InferPositionals,
  NumberOption,
  NumberPositional,
  OptionDef,
  OptionsSchema,
  PositionalDef,
  PositionalsSchema,
  StringOption,
  StringPositional,
  VariadicPositional,
} from './types.js';
```

**Step 4: Run test to verify it passes**

Run: `npm test -- test/exports.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/index.ts test/exports.test.ts
git commit -m "feat(exports): add theme utilities to public API

- Export themes object with built-in themes
- Export getTheme, createStyler, defaultTheme utilities
- Export Theme, ThemeColors, ThemeInput, Styler, StyleFn types
- Export BargsOptions type for runtime options"
```

---

## Part 6: Remove Legacy ANSI Module

### Task 7: Remove src/ansi.ts and Update Imports

**Files:**

- Delete: `src/ansi.ts`
- Modify: `test/ansi.test.ts` (delete or migrate)

**Step 1: Check for remaining usages of ansi.ts**

Run: `grep -r "from './ansi" src/`

If any usages remain besides help.ts (which we already updated), update them.

**Step 2: Migrate or delete ansi.test.ts**

The stripAnsi function is still useful - keep it in theme.ts:

```typescript
// Add to src/theme.ts
import { stripVTControlCharacters } from 'node:util';

/**
 * Strip all ANSI escape codes from a string.
 */
export const stripAnsi = stripVTControlCharacters;
```

Update test/ansi.test.ts to import from theme.ts:

```typescript
// test/ansi.test.ts
import { describe, expect, it } from 'vitest';
import { stripAnsi } from '../src/theme.js';

describe('stripAnsi', () => {
  it('removes ANSI codes from string', () => {
    const colored = '\x1b[31mred\x1b[0m';
    expect(stripAnsi(colored)).toBe('red');
  });

  it('passes through plain text', () => {
    expect(stripAnsi('hello')).toBe('hello');
  });
});
```

**Step 3: Delete src/ansi.ts**

```bash
rm src/ansi.ts
```

**Step 4: Run all tests to verify nothing is broken**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor: consolidate ANSI utilities into theme module

- Move stripAnsi to theme.ts
- Delete src/ansi.ts
- Update test imports"
```

---

## Part 7: Add Positional Styling Support

### Task 8: Style Positionals in Help Output

**Files:**

- Modify: `src/help.ts`
- Modify: `test/help.test.ts`

**Step 1: Write the failing test**

```typescript
// Add to test/help.test.ts

describe('generateHelp with positionals', () => {
  it('styles positional arguments', () => {
    const config = {
      name: 'test-app',
      options: {},
      positionals: [
        { type: 'string' as const, description: 'Input file', required: true },
      ],
    };
    const help = generateHelp(config);
    // Should show positionals in usage line
    expect(help).toContain('<arg0>');
  });

  it('applies positional color from theme', () => {
    const customTheme = {
      colors: {
        scriptName: '',
        command: '',
        flag: '',
        positional: '\x1b[33m', // yellow
        description: '',
        sectionHeader: '',
        type: '',
        defaultValue: '',
        usage: '',
        example: '',
      },
    };
    const config = {
      name: 'test-app',
      options: {},
      positionals: [
        { type: 'string' as const, description: 'Input file', required: true },
      ],
    };
    const help = generateHelp(config, customTheme);
    expect(help).toContain('\x1b[33m'); // positional color applied
  });
});
```

**Step 2: Run test to verify behavior**

Run: `npm test -- test/help.test.ts`
Check if positionals are already displayed - if not, implement.

**Step 3: Add positional display to generateHelp**

Update generateHelp in `src/help.ts` to show positionals:

```typescript
// In generateHelp, after the Usage section:

// Show positionals in usage line
if (config.positionals && config.positionals.length > 0) {
  const posNames = config.positionals.map((p, i) => {
    const name = `arg${i}`;
    const formatted = p.required ? `<${name}>` : `[${name}]`;
    return styler.positional(formatted);
  });

  // Update usage line to include positionals
  if (hasCommands(config)) {
    lines[usageLineIndex] = styler.usage(
      `  $ ${config.name} <command> [options] ${posNames.join(' ')}`,
    );
  } else {
    lines[usageLineIndex] = styler.usage(
      `  $ ${config.name} [options] ${posNames.join(' ')}`,
    );
  }

  // Add POSITIONALS section
  lines.push(styler.sectionHeader('POSITIONALS'));
  for (let i = 0; i < config.positionals.length; i++) {
    const pos = config.positionals[i];
    const name = `arg${i}`;
    const formatted = pos.required ? `<${name}>` : `[${name}]`;
    const padding = Math.max(0, 20 - formatted.length);
    const desc = pos.description ?? '';
    lines.push(
      `  ${styler.positional(formatted)}${' '.repeat(padding)}${styler.description(desc)}`,
    );
  }
  lines.push('');
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- test/help.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/help.ts test/help.test.ts
git commit -m "feat(help): add positional argument display with theming

- Show positionals in usage line
- Add POSITIONALS section when positionals defined
- Apply positional color from theme"
```

---

## Part 8: Final Integration and Cleanup

### Task 9: Run Full Test Suite and Lint

**Files:**

- All modified files

**Step 1: Run full test suite**

Run: `npm test`
Expected: All tests PASS

**Step 2: Run linter**

Run: `npm run lint`
Expected: No errors

**Step 3: Run type check**

Run: `npm run typecheck` or `npx tsc --noEmit`
Expected: No errors

**Step 4: Fix any issues found**

Address any test failures, lint errors, or type errors.

**Step 5: Commit fixes if any**

```bash
git add -A
git commit -m "fix: address lint and type errors"
```

---

### Task 10: Update Example to Demonstrate Theme Usage

**Files:**

- Modify: `examples/greeter.ts`

**Step 1: Add theme demonstration**

Update greeter.ts to accept a --color flag and pass theme via second parameter:

```typescript
#!/usr/bin/env npx tsx
import { bargs, themes, type ThemeInput } from '../src/index.js';

const optionsDef = bargs.options({
  greeting: bargs.string({
    description: 'The greeting to use',
    default: 'Hello',
    aliases: ['g'],
  }),
  shout: bargs.boolean({
    description: 'SHOUT THE GREETING',
    default: false,
    aliases: ['s'],
  }),
  verbose: bargs.boolean({
    description: 'Show extra output',
    default: false,
    aliases: ['v'],
  }),
  color: bargs.enum({
    description: 'Color theme for help output',
    choices: ['default', 'mono', 'ocean', 'warm'] as const,
    default: 'default',
    aliases: ['c'],
  }),
});

const positionalsDef = bargs.positionals(
  bargs.stringPos({ description: 'Name to greet', required: true }),
);

const main = async () => {
  // Get color preference from args before full parse (for --help theming)
  const colorArg = process.argv.find((a) => a.startsWith('--color='));
  const theme: ThemeInput = colorArg
    ? (colorArg.split('=')[1] as keyof typeof themes)
    : 'default';

  const result = await bargs(
    {
      name: 'greeter',
      version: '1.0.0',
      description: 'A friendly greeter CLI',
      options: optionsDef,
      positionals: positionalsDef,
    },
    { theme }, // Runtime options as second parameter
  );

  const { positionals, values } = result;
  const [name] = positionals;
  const { greeting, shout, verbose } = values;

  let message = `${greeting}, ${name}!`;

  if (shout) {
    message = message.toUpperCase();
  }

  if (verbose) {
    console.log('Configuration:', { greeting, name, shout });
  }

  console.log(message);
};

void main();
```

**Step 2: Test the example**

Run: `npx tsx examples/greeter.ts --help`
Run: `npx tsx examples/greeter.ts --help --color=mono`
Run: `npx tsx examples/greeter.ts --help --color=ocean`

Verify help output changes with different themes.

**Step 3: Commit**

```bash
git add examples/greeter.ts
git commit -m "docs(examples): demonstrate theme usage in greeter

- Add --color flag to select theme
- Pass theme via second parameter (BargsOptions)
- Show themed help output"
```

---

## Summary

This plan implements themeable help colors for bargs with:

1. **Theme types**: `Theme`, `ThemeColors`, `ThemeInput`, `Styler`
2. **Built-in themes**: `default`, `mono`, `ocean`, `warm`
3. **API integration**: `BargsOptions` second parameter with `theme` property
4. **Utilities**: `getTheme()`, `createStyler()`, `stripAnsi()`
5. **Full exports**: All theme types and utilities available from `bargs`

Users can:

- Use built-in themes by name: `bargs(config, { theme: 'mono' })`
- Create custom themes: `bargs(config, { theme: { colors: { ... } } })`
- Access theme utilities for advanced use cases

**API Design**: The theme (and future runtime options) are passed as a second parameter to `bargs()`, keeping the parsing config (first parameter) clean and focused on CLI definition.

```typescript
// Simple usage with built-in theme
await bargs(config, { theme: 'ocean' });

// Custom theme
await bargs(config, { theme: { colors: { flag: '\x1b[35m', ... } } });

// No options (defaults to 'default' theme)
await bargs(config);
```

The implementation follows TDD with small, focused commits across 10 tasks.
