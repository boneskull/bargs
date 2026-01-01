<p align="center">
  <a href="/"><img src="./assets/logo.png" width="512px" align="center" alt="bargs: a barg parser"/></a>
  <h1 align="center"><span class="bargs">⁓ bargs ⁓<span></h1>
  <p align="center">
    <em>“Ex argumentis, veritas”</em>
    <br/>
    <small>by <a href="https://github.com/boneskull" title="@boneskull on GitHub">@boneskull</a></small>
  </p>
</p>

## Install

```shell
npm install @boneskull/bargs
```

## Why bargs?

Most argument parsers make you choose: either a simple API with weak types, or a complex and overengineered DSL. **bargs** uses _function helpers_ that instead provide a well-typed and composable API.

### Type-Safe by Construction

Each helper returns a fully-typed option definition:

```typescript
const verbose = bargs.boolean({ aliases: ['v'] });
// Type: BooleanOption & { aliases: ['v'] }

const level = bargs.enum(['low', 'medium', 'high'], { default: 'medium' });
// Type: EnumOption<'low' | 'medium' | 'high'> & { default: 'medium' }
```

When you pass these to `bargs()`, the result is always well-typed; options with defaults or `required: true` are non-nullable.

### Composable

Since helpers are just functions returning objects, composition is trivial:

```typescript
// Shared options across commands
const verboseOpt = { verbose: bargs.boolean({ aliases: ['v'] }) };
const outputOpt = {
  output: bargs.string({ aliases: ['o'], default: 'stdout' }),
};

// Merge with spread
const result = bargs({
  name: 'tool',
  options: {
    ...verboseOpt,
    ...outputOpt,
    format: bargs.enum(['json', 'text']),
  },
});
```

Or use `bargs.options()` and `bargs.positionals()`:

```typescript
// Throws if aliases collide
const sharedOpts = bargs.options(verboseOpt, outputOpt);

// Combine positionals with type inference
const sharedPos = bargs.positionals(
  bargs.stringPos({ name: 'input', required: true }),
  bargs.stringPos({ name: 'output' }),
);
```

### Zero (0) Dependencies

Only Node.js v22+.

## Quick Start

```typescript
import { bargs } from '@boneskull/bargs';

const result = bargs({
  name: 'greet',
  options: {
    name: bargs.string({ default: 'world' }),
    loud: bargs.boolean({ aliases: ['l'] }),
  },
});

const greeting = `Hello, ${result.values.name}!`;
console.log(result.values.loud ? greeting.toUpperCase() : greeting);
```

```shell
$ greet --name Alice --loud
HELLO, ALICE!
```

## Sync vs Async

**`bargs()`** runs synchronously. If a handler returns a `Promise`, it will break and you will be sorry.

```typescript
// Sync - no await needed
const result = bargs({
  name: 'my-cli',
  options: { verbose: bargs.boolean() },
  handler: ({ values }) => {
    console.log('Verbose:', values.verbose);
  },
});
```

Instead, use **`bargsAsync()`**:

```typescript
import { bargsAsync } from '@boneskull/bargs';

// Async - handlers can return Promises
const result = await bargsAsync({
  name: 'my-cli',
  options: { url: bargs.string({ required: true }) },
  handler: async ({ values }) => {
    const response = await fetch(values.url);
    console.log(await response.text());
  },
});
```

## Commands

Define subcommands with `bargs.command()`:

```typescript
bargs({
  name: 'db',
  commands: {
    migrate: bargs.command({
      description: 'Run database migrations',
      options: { dry: bargs.boolean({ aliases: ['n'] }) },
      handler: ({ values }) => {
        console.log(values.dry ? 'Dry run...' : 'Migrating...');
      },
    }),
    seed: bargs.command({
      description: 'Seed the database',
      positionals: [bargs.stringPos({ required: true })],
      handler: ({ positionals }) => {
        const [file] = positionals;
        console.log(`Seeding from ${file}...`);
      },
    }),
  },
});
```

```shell
$ db migrate --dry
Dry run...

$ db seed data.sql
Seeding from data.sql...
```

### Default Handler

For command-based CLIs, use `defaultHandler` to handle the case when no command is provided:

```typescript
bargs({
  name: 'git',
  commands: {
    /* ... */
  },
  // Run 'status' when no command given
  defaultHandler: 'status',
});

// Or provide a custom handler
bargs({
  name: 'git',
  commands: {
    /* ... */
  },
  defaultHandler: ({ values }) => {
    console.log('Run "git --help" for usage');
  },
});
```

## Configuration

### Config Properties

| Property      | Type                  | Description                                       |
| ------------- | --------------------- | ------------------------------------------------- |
| `name`        | `string`              | CLI name (required)                               |
| `description` | `string`              | Description shown in help                         |
| `version`     | `string`              | Enables `--version` flag                          |
| `options`     | `OptionsSchema`       | Named options (`--flag`)                          |
| `positionals` | `PositionalsSchema`   | Positional arguments                              |
| `commands`    | `Record<string, ...>` | Subcommands                                       |
| `handler`     | `Handler`             | Handler function(s) for simple CLIs               |
| `epilog`      | `string \| false`     | Footer text in help (see [Epilog](#epilog))       |
| `args`        | `string[]`            | Custom args (defaults to `process.argv.slice(2)`) |

```typescript
bargs({
  name: 'my-cli',
  description: 'Does amazing things',
  version: '1.2.3', // enables --version
  args: ['--verbose', 'file.txt'], // useful for testing
  options: {
    /* ... */
  },
});
```

### Runtime Options

The second argument to `bargs()` or `bargsAsync()` accepts runtime options:

| Property | Type         | Description                                    |
| -------- | ------------ | ---------------------------------------------- |
| `theme`  | `ThemeInput` | `--help` Color theme (see [Theming](#theming)) |

```typescript
bargs(config, { theme: 'ocean' });
```

## Option Helpers

```typescript
bargs.string({ default: 'value' }); // --name value
bargs.number({ default: 42 }); // --count 42
bargs.boolean({ aliases: ['v'] }); // --verbose, -v
bargs.enum(['a', 'b', 'c']); // --level a
bargs.array('string'); // --file x --file y
bargs.count(); // -vvv → 3
```

### Option Properties

All option helpers accept these properties:

| Property      | Type       | Description                                      |
| ------------- | ---------- | ------------------------------------------------ |
| `aliases`     | `string[]` | Short flags (e.g., `['v']` for `-v`)             |
| `default`     | varies     | Default value (makes the option non-nullable)    |
| `description` | `string`   | Help text description                            |
| `group`       | `string`   | Groups options under a custom section header     |
| `hidden`      | `boolean`  | Hide from `--help` output                        |
| `required`    | `boolean`  | Mark as required (makes the option non-nullable) |

Example:

```typescript
bargs.string({
  aliases: ['o'],
  default: 'output.txt',
  description: 'Output file path',
  group: 'Output Options',
});

// Hidden options won't appear in help
bargs.boolean({ hidden: true });
```

## Positional Helpers

```typescript
bargs.stringPos({ required: true }); // <file>
bargs.numberPos({ default: 8080 }); // [port]
bargs.enumPos(['dev', 'prod']); // [env]
bargs.variadic('string'); // [files...]
```

### Positional Properties

| Property      | Type      | Description                                            |
| ------------- | --------- | ------------------------------------------------------ |
| `default`     | varies    | Default value                                          |
| `description` | `string`  | Help text description                                  |
| `name`        | `string`  | Display name in help (defaults to `arg0`, `arg1`, ...) |
| `required`    | `boolean` | Mark as required (shown as `<name>` vs `[name]`)       |

Example:

```typescript
bargs.stringPos({
  name: 'file',
  description: 'Input file to process',
  required: true,
});
```

Positionals are defined as an array and accessed by index:

```typescript
const result = bargs({
  name: 'cp',
  positionals: [
    bargs.stringPos({ required: true }), // source
    bargs.stringPos({ required: true }), // destination
  ],
});

const [source, dest] = result.positionals;
console.log(`Copying ${source} to ${dest}`);
```

Use `variadic` for rest arguments (must be last):

```typescript
const result = bargs({
  name: 'cat',
  positionals: [bargs.variadic('string')],
});

const [files] = result.positionals; // string[]
files.forEach((file) => console.log(readFileSync(file, 'utf8')));
```

## Epilog

By default, **bargs** displays your package's homepage and repository URLs (from `package.json`) at the end of help output. URLs become clickable hyperlinks in supported terminals.

```typescript
// Custom epilog
bargs({
  name: 'my-cli',
  epilog: 'For more info, visit https://example.com',
});

// Disable epilog entirely
bargs({
  name: 'my-cli',
  epilog: false,
});
```

## Theming

Customize help output colors with built-in themes or your own:

```typescript
// Use a built-in theme: 'default', 'mono', 'ocean', 'warm'
bargs(
  {
    name: 'my-cli',
    options: { verbose: bargs.boolean() },
  },
  { theme: 'ocean' },
);

// Disable colors entirely
bargs(config, { theme: 'mono' });
```

The `ansi` export provides common ANSI escape codes for styled terminal output: text styles (`bold`, `dim`, `italic`, `underline`, etc.), foreground colors, background colors, and their `bright*` variants. Use this to create your own themes (instead of hardcoding ANSI escape codes).

```typescript
import { ansi } from '@boneskull/bargs';

bargs(someConfig, {
  theme: {
    command: ansi.bold,
    defaultText: ansi.dim,
    defaultValue: ansi.white,
    description: ansi.white,
    epilog: ansi.dim,
    example: ansi.white + ansi.dim,
    flag: ansi.brightCyan,
    positional: ansi.magenta,
    scriptName: ansi.bold,
    sectionHeader: ansi.brightMagenta,
    type: ansi.magenta,
    url: ansi.cyan,
    usage: ansi.cyan,
  },
});
```

Available theme color slots:

| Slot            | What it styles                                  |
| --------------- | ----------------------------------------------- |
| `command`       | Command names (e.g., `init`, `build`)           |
| `defaultText`   | The `default:` label                            |
| `defaultValue`  | Default value (e.g., `false`, `"hello"`)        |
| `description`   | Description text for options and commands       |
| `epilog`        | Footer text (homepage, repository)              |
| `example`       | Example code/commands                           |
| `flag`          | Flag names (e.g., `--verbose`, `-v`)            |
| `positional`    | Positional argument names (e.g., `<file>`)      |
| `scriptName`    | CLI name shown in header                        |
| `sectionHeader` | Section headers (e.g., `USAGE`, `OPTIONS`)      |
| `type`          | Type annotations (e.g., `[string]`, `[number]`) |
| `url`           | URLs (for clickable hyperlinks)                 |
| `usage`         | The usage line text                             |

> [!TIP]
> You don't need to specify all color slots. Missing colors fall back to the default theme.

## Advanced Usage

### Error Handling

**bargs** exports some `Error` subclasses:

```typescript
import {
  bargs,
  BargsError,
  HelpError,
  ValidationError,
} from '@boneskull/bargs';

try {
  bargs(config);
} catch (error) {
  if (error instanceof ValidationError) {
    // Config validation failed (e.g., invalid schema)
    console.error(`Config error at "${error.path}": ${error.message}`);
  } else if (error instanceof HelpError) {
    // User needs guidance (e.g., unknown option)
    console.error(error.message);
  } else if (error instanceof BargsError) {
    // General bargs error
    console.error(error.message);
  }
}
```

### Programmatic Help

Generate help text without calling `bargs()`:

```typescript
import { generateHelp, generateCommandHelp } from '@boneskull/bargs';

const helpText = generateHelp(config);
const commandHelp = generateCommandHelp(config, 'migrate');
```

### Hyperlink Utilities

Create clickable terminal hyperlinks ([OSC 8](https://github.com/Alhadis/OSC8-Adoption)):

```typescript
import { link, linkifyUrls, supportsHyperlinks } from '@boneskull/bargs';

// Check if terminal supports hyperlinks
if (supportsHyperlinks()) {
  // Create a hyperlink
  console.log(link('Click me', 'https://example.com'));

  // Auto-linkify URLs in text
  console.log(linkifyUrls('Visit https://example.com for more info'));
}
```

> [!TIP]
> **bargs** already automatically links URLs in `--help` output if the terminal supports hyperlinks.

### Additional Theme Utilities

```typescript
import {
  ansi, // ANSI escape codes
  createStyler, // Create a styler from a theme
  defaultTheme, // The default theme object
  stripAnsi, // Remove ANSI codes from string
  themes, // All built-in themes
} from '@boneskull/bargs';

// Create a custom styler
const styler = createStyler({ colors: { flag: ansi.green } });
console.log(styler.flag('--verbose'));

// Strip ANSI codes for plain text output
const plain = stripAnsi('\x1b[32m--verbose\x1b[0m'); // '--verbose'

// Override some colors in a built-in theme
const customTheme = { ...themes.ocean, colors: { flag: ansi.green } };
```

## Motivation

I've always reached for [yargs](https://github.com/yargs/yargs) in my CLI projects. However, I find myself repeatedly doing the same things; I have a sort of boilerplate in my head, ready to go (`requiresArg: true` and `nargs: 1`, amirite?). I don't want boilerplate in my head. I wanted to distill my chosen subset of yargs' behavior into a composable API. And so **bargs** was begat.

## License

Copyright © 2025 [Christopher "boneskull" Hiller](https://github.com/boneskull). Licensed under the [Blue Oak Model License 1.0.0](./LICENSE).
