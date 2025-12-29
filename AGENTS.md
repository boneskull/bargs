# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is bargs?

A TypeScript-first CLI argument parser wrapping Node.js `util.parseArgs()` with full type inference. Zero runtime dependencies.

## Commands

```bash
npm test                    # Run all tests
npm run test:watch          # Watch mode for tests
npm run lint                # Run all linters (ESLint, Prettier, types, knip, spelling, markdown)
npm run fix                 # Auto-fix lint issues
npm run build               # Build with zshy (dual CJS/ESM)
npm run lint:types          # TypeScript check only

# Run a single test file
node --import tsx --test "test/parser.test.ts"

# Run tests matching a pattern
node --import tsx --test --test-name-pattern="parses string" "test/**/*.test.ts"
```

## Architecture

### Entry Point Pattern

`src/index.ts` exports `bargs` as a function with builder methods attached via `Object.assign(parseAsync, opt)`. This allows:

```typescript
import { bargs } from 'bargs';
bargs({ ... });           // Call as function
bargs.string({ ... });    // Use as builder namespace
```

### Core Modules

- **types.ts** - All type definitions. Key types:
  - `OptionsSchema` / `PositionalsSchema` - Schema definitions
  - `InferOptions<T>` / `InferPositionals<T>` - Type inference utilities
  - `BargsConfig` (simple CLI) vs `BargsConfigWithCommands` (command-based CLI)
  - `CommandConfig` vs `CommandConfigInput` - typed vs type-erased command configs

- **opt.ts** - Builder functions (`opt.string()`, `opt.boolean()`, `opt.enum()`, etc.). Uses function overloads for tuple type preservation in `opt.options()` and `opt.positionals()`.

- **parser.ts** - `parseSimple()` and `parseCommands()` wrap `util.parseArgs()` with type coercion and validation.

- **bargs.ts** - Main entry point with overloaded signatures for simple vs command-based CLIs. Handles `--help` and `--version` flags.

- **help.ts** - Generates help text with ANSI formatting.

### Type Inference Design

The library uses several TypeScript patterns for type inference:

1. **Const type parameters** - `opt.enum()` uses `<const T extends readonly string[]>` to infer literal types without requiring `as const`.

2. **Function overloads** - `opt.options()` and `opt.positionals()` have overloads up to 4 params to preserve tuple types.

3. **Discriminated unions** - Option types use `type` field discriminator (`'string' | 'boolean' | 'number' | 'enum' | 'array' | 'count'`).

4. **Handler typing** - `CommandConfig.handler` receives `InferOptions<TOptions> & Record<string, unknown>` so command-local options are typed while global options are accessible but untyped.

### Simple CLI vs Command-based CLI

- **Simple CLI**: Uses `BargsConfig`, supports `positionals` at top level, optional `handler`
- **Command-based CLI**: Uses `BargsConfigWithCommands`, no top-level `positionals` (each command has its own), supports `defaultHandler`

## Testing

Tests use Node.js built-in test runner (`node:test`) with `node:assert/strict`. Test files are in `test/` with `.test.ts` extension.

## Examples

Working examples in `examples/`:

- `greeter.ts` - Simple CLI with options and positionals
- `tasks.ts` - Command-based CLI with global options, subcommands, and handlers

## Workflow

When asked to perform work in a worktree:

1. Create the Git worktree under `.worktrees/`, creating a new feature branch for it
2. Navigate to the new worktree directory.
3. Execute `npm install` in the worktreedirectory.
