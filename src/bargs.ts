/**
 * Core bargs API using parser combinator pattern.
 *
 * Provides `bargs.create()` for building CLIs with a fluent API, plus
 * combinator functions like `pipe()`, `map()`, and `handle()`.
 *
 * @packageDocumentation
 */

import type {
  CliBuilder,
  Command,
  CreateOptions,
  HandlerFn,
  Parser,
  ParseResult,
} from './types.js';

import { BargsError, HelpError } from './errors.js';
import { generateCommandHelp, generateHelp } from './help.js';
import { parseSimple } from './parser.js';
import { defaultTheme, getTheme, type Theme } from './theme.js';

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Transform fn type - can be sync or async.
 *
 * @knipignore
 */
export type TransformFn<
  V1,
  P1 extends readonly unknown[],
  V2,
  P2 extends readonly unknown[],
> = (
  result: ParseResult<V1, P1>,
) => ParseResult<V2, P2> | Promise<ParseResult<V2, P2>>;
// Type for commands that may have transforms
type CommandWithTransform<V, P extends readonly unknown[]> = Command<V, P> & {
  __transform?: (
    r: ParseResult<unknown, readonly unknown[]>,
  ) => ParseResult<V, P>;
};
interface InternalCliState {
  commands: Map<
    string,
    { cmd: Command<unknown, readonly unknown[]>; description?: string }
  >;
  defaultCommandName?: string;
  globalParser?: Parser<unknown, readonly unknown[]>;
  name: string;
  options: CreateOptions;
  theme: Theme;
}
// Type for parsers that may have transforms
type ParserWithTransform<V, P extends readonly unknown[]> = Parser<V, P> & {
  __transform?: (
    r: ParseResult<unknown, readonly unknown[]>,
  ) => ParseResult<V, P>;
};

// ═══════════════════════════════════════════════════════════════════════════════
// MERGE COMBINATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a command with a handler (terminal in the pipeline).
 */
export function handle<V, P extends readonly unknown[]>(
  fn: HandlerFn<V, P>,
): (parser: Parser<V, P>) => Command<V, P>;

export function handle<V, P extends readonly unknown[]>(
  parser: Parser<V, P>,
  fn: HandlerFn<V, P>,
): Command<V, P>;

export function handle<V, P extends readonly unknown[]>(
  parserOrFn: HandlerFn<V, P> | Parser<V, P>,
  maybeFn?: HandlerFn<V, P>,
): ((parser: Parser<V, P>) => Command<V, P>) | Command<V, P> {
  // Direct form: handle(parser, fn) returns Command
  // Check for Parser first since CallableParser is also a function
  if (isParser(parserOrFn)) {
    const parser = parserOrFn;
    const parserWithTransform = parser as ParserWithTransform<V, P>;
    const fn = maybeFn!;
    const cmd: CommandWithTransform<V, P> = {
      __brand: 'Command',
      __optionsSchema: parser.__optionsSchema,
      __positionalsSchema: parser.__positionalsSchema,
      handler: fn,
    };
    // Preserve transforms from the parser
    if (parserWithTransform.__transform) {
      cmd.__transform = parserWithTransform.__transform;
    }
    return cmd;
  }

  // Curried form: handle(fn) returns (parser) => Command
  const fn = parserOrFn;
  return (parser: Parser<V, P>): Command<V, P> => {
    const parserWithTransform = parser as ParserWithTransform<V, P>;
    const cmd: CommandWithTransform<V, P> = {
      __brand: 'Command',
      __optionsSchema: parser.__optionsSchema,
      __positionalsSchema: parser.__positionalsSchema,
      handler: fn,
    };
    // Preserve transforms from the parser
    if (parserWithTransform.__transform) {
      cmd.__transform = parserWithTransform.__transform;
    }
    return cmd;
  };
}

/**
 * Transform parse result in the pipeline.
 */
export function map<
  V1,
  P1 extends readonly unknown[],
  V2,
  P2 extends readonly unknown[],
>(fn: TransformFn<V1, P1, V2, P2>): (parser: Parser<V1, P1>) => Parser<V2, P2>;

export function map<
  V1,
  P1 extends readonly unknown[],
  V2,
  P2 extends readonly unknown[],
>(parser: Parser<V1, P1>, fn: TransformFn<V1, P1, V2, P2>): Parser<V2, P2>;
export function map<
  V1,
  P1 extends readonly unknown[],
  V2,
  P2 extends readonly unknown[],
>(
  parserOrFn: Parser<V1, P1> | TransformFn<V1, P1, V2, P2>,
  maybeFn?: TransformFn<V1, P1, V2, P2>,
): ((parser: Parser<V1, P1>) => Parser<V2, P2>) | Parser<V2, P2> {
  // Direct form: map(parser, fn) returns Parser
  // Check for Parser first since CallableParser is also a function
  if (isParser(parserOrFn)) {
    const parser = parserOrFn;
    const fn = maybeFn!;
    return {
      ...parser,
      __brand: 'Parser',
      __positionals: [] as unknown as P2,
      __transform: fn,
      __values: {} as V2,
    } as Parser<V2, P2> & { __transform: typeof fn };
  }

  // Curried form: map(fn) returns (parser) => Parser
  const fn = parserOrFn;
  return (parser: Parser<V1, P1>): Parser<V2, P2> => {
    return {
      ...parser,
      __brand: 'Parser',
      __positionals: [] as unknown as P2,
      __transform: fn,
      __values: {} as V2,
    } as Parser<V2, P2> & { __transform: typeof fn };
  };
}
/**
 * Merge multiple parsers into one.
 *
 * Combines options and positionals from all parsers. Later parsers' options
 * override earlier ones if there are conflicts.
 *
 * @example
 *
 * ```typescript
 * const parser = merge(
 *   opt.options({ verbose: opt.boolean() }),
 *   pos.positionals(pos.string({ name: 'file', required: true })),
 * );
 * ```
 */
export function merge<
  V1,
  P1 extends readonly unknown[],
  V2,
  P2 extends readonly unknown[],
>(
  p1: Parser<V1, P1>,
  p2: Parser<V2, P2>,
): Parser<V1 & V2, readonly [...P1, ...P2]>;

export function merge<
  V1,
  P1 extends readonly unknown[],
  V2,
  P2 extends readonly unknown[],
  V3,
  P3 extends readonly unknown[],
>(
  p1: Parser<V1, P1>,
  p2: Parser<V2, P2>,
  p3: Parser<V3, P3>,
): Parser<V1 & V2 & V3, readonly [...P1, ...P2, ...P3]>;

// ═══════════════════════════════════════════════════════════════════════════════
// MAP COMBINATOR
// ═══════════════════════════════════════════════════════════════════════════════

export function merge<
  V1,
  P1 extends readonly unknown[],
  V2,
  P2 extends readonly unknown[],
  V3,
  P3 extends readonly unknown[],
  V4,
  P4 extends readonly unknown[],
>(
  p1: Parser<V1, P1>,
  p2: Parser<V2, P2>,
  p3: Parser<V3, P3>,
  p4: Parser<V4, P4>,
): Parser<V1 & V2 & V3 & V4, readonly [...P1, ...P2, ...P3, ...P4]>;

export function merge(
  ...parsers: Array<Parser<unknown, readonly unknown[]>>
): Parser<unknown, readonly unknown[]> {
  if (parsers.length === 0) {
    throw new BargsError('merge() requires at least one parser');
  }

  // Start with the first parser and fold the rest in
  let result = parsers[0]!;

  for (let i = 1; i < parsers.length; i++) {
    const next = parsers[i]!;

    // Merge options schemas
    const mergedOptions = {
      ...result.__optionsSchema,
      ...next.__optionsSchema,
    };

    // Merge positionals schemas
    const mergedPositionals = [
      ...result.__positionalsSchema,
      ...next.__positionalsSchema,
    ];

    // Preserve transforms from both parsers (chain them)
    type AsyncTransform = (
      r: ParseResult<unknown, readonly unknown[]>,
    ) =>
      | ParseResult<unknown, readonly unknown[]>
      | Promise<ParseResult<unknown, readonly unknown[]>>;

    const resultWithTransform = result as { __transform?: AsyncTransform };
    const nextWithTransform = next as { __transform?: AsyncTransform };

    let mergedTransform: AsyncTransform | undefined;
    if (resultWithTransform.__transform && nextWithTransform.__transform) {
      // Chain transforms
      const t1 = resultWithTransform.__transform;
      const t2 = nextWithTransform.__transform;
      mergedTransform = (r) => {
        const r1 = t1(r);
        if (r1 instanceof Promise) {
          return r1.then(t2);
        }
        return t2(r1);
      };
    } else {
      mergedTransform =
        nextWithTransform.__transform ?? resultWithTransform.__transform;
    }

    result = {
      __brand: 'Parser',
      __optionsSchema: mergedOptions,
      __positionals: [] as unknown as readonly unknown[],
      __positionalsSchema: mergedPositionals,
      __values: {} as unknown,
    };

    if (mergedTransform) {
      (result as { __transform?: AsyncTransform }).__transform =
        mergedTransform;
    }
  }

  return result;
}
// ═══════════════════════════════════════════════════════════════════════════════
// CLI BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new CLI.
 *
 * @example
 *
 * ```typescript
 * const cli = await bargs
 *   .create('my-app', { version: '1.0.0' })
 *   .globals(
 *     map(opt.options({ verbose: opt.boolean() }), ({ values }) => ({
 *       values: { ...values, ts: Date.now() },
 *       positionals: [] as const,
 *     })),
 *   )
 *   .command(
 *     'greet',
 *     pos.positionals(pos.string({ name: 'name', required: true })),
 *     ({ positionals }) => console.log(`Hello, ${positionals[0]}!`),
 *   )
 *   .parseAsync();
 * ```
 */
const create = (
  name: string,
  options: CreateOptions = {},
): CliBuilder<Record<string, never>, readonly []> => {
  const theme = options.theme ? getTheme(options.theme) : defaultTheme;

  return createCliBuilder<Record<string, never>, readonly []>({
    commands: new Map(),
    name,
    options,
    theme,
  });
};

/**
 * Check if something is a Command (has __brand: 'Command').
 */
const isCommand = (x: unknown): x is Command<unknown, readonly unknown[]> => {
  if (x === null || x === undefined) {
    return false;
  }
  const obj = x as Record<string, unknown>;
  return '__brand' in obj && obj.__brand === 'Command';
};

/**
 * Create a CLI builder.
 */
const createCliBuilder = <V, P extends readonly unknown[]>(
  state: InternalCliState,
): CliBuilder<V, P> => {
  return {
    // Overloaded command(): accepts either (name, Command, desc?) or (name, Parser, handler, desc?)
    command<CV, CP extends readonly unknown[]>(
      name: string,
      cmdOrParser: Command<CV, CP> | Parser<CV, CP>,
      handlerOrDesc?: HandlerFn<CV & V, CP> | string,
      maybeDesc?: string,
    ): CliBuilder<V, P> {
      let cmd: Command<unknown, readonly unknown[]>;
      let description: string | undefined;

      if (isCommand(cmdOrParser)) {
        // Form 1: command(name, Command, description?)
        cmd = cmdOrParser;
        description = handlerOrDesc as string | undefined;
      } else if (isParser(cmdOrParser)) {
        // Form 2: command(name, Parser, handler, description?)
        const parser = cmdOrParser;
        const handler = handlerOrDesc as HandlerFn<CV & V, CP>;
        description = maybeDesc;

        // Create Command from Parser + handler
        const parserWithTransform = parser as ParserWithTransform<CV, CP>;
        const newCmd: CommandWithTransform<CV & V, CP> = {
          __brand: 'Command',
          __optionsSchema: parser.__optionsSchema,
          __positionalsSchema: parser.__positionalsSchema,
          handler,
        };
        // Preserve transforms from the parser
        if (parserWithTransform.__transform) {
          newCmd.__transform = parserWithTransform.__transform as (
            r: ParseResult<unknown, readonly unknown[]>,
          ) => ParseResult<CV & V, CP>;
        }
        cmd = newCmd as Command<unknown, readonly unknown[]>;
      } else {
        throw new Error(
          'command() requires a Command or Parser as second argument',
        );
      }

      state.commands.set(name, { cmd, description });
      return this;
    },

    // Overloaded defaultCommand(): accepts name, Command, or (Parser, handler)
    defaultCommand<CV, CP extends readonly unknown[]>(
      nameOrCmdOrParser: Command<CV, CP> | Parser<CV, CP> | string,
      maybeHandler?: HandlerFn<CV & V, CP>,
    ): CliBuilder<V, P> {
      // Form 1: defaultCommand(name) - just set the name
      if (typeof nameOrCmdOrParser === 'string') {
        return createCliBuilder<V, P>({
          ...state,
          defaultCommandName: nameOrCmdOrParser,
        });
      }

      // Generate a unique name for the default command
      const defaultName = '__default__';

      if (isCommand(nameOrCmdOrParser)) {
        // Form 2: defaultCommand(Command)
        state.commands.set(defaultName, {
          cmd: nameOrCmdOrParser,
          description: undefined,
        });
      } else if (isParser(nameOrCmdOrParser)) {
        // Form 3: defaultCommand(Parser, handler)
        const parser = nameOrCmdOrParser;
        const handler = maybeHandler!;

        const parserWithTransform = parser as ParserWithTransform<CV, CP>;
        const newCmd: CommandWithTransform<CV & V, CP> = {
          __brand: 'Command',
          __optionsSchema: parser.__optionsSchema,
          __positionalsSchema: parser.__positionalsSchema,
          handler,
        };
        // Preserve transforms from the parser
        if (parserWithTransform.__transform) {
          newCmd.__transform = parserWithTransform.__transform as (
            r: ParseResult<unknown, readonly unknown[]>,
          ) => ParseResult<CV & V, CP>;
        }
        state.commands.set(defaultName, {
          cmd: newCmd as Command<unknown, readonly unknown[]>,
          description: undefined,
        });
      } else {
        throw new Error('defaultCommand() requires a name, Command, or Parser');
      }

      return createCliBuilder<V, P>({
        ...state,
        defaultCommandName: defaultName,
      });
    },

    globals<V2, P2 extends readonly unknown[]>(
      parser: Parser<V2, P2>,
    ): CliBuilder<V2, P2> {
      return createCliBuilder<V2, P2>({
        ...state,
        globalParser: parser as Parser<unknown, readonly unknown[]>,
      });
    },

    parse(
      args: string[] = process.argv.slice(2),
    ): ParseResult<V, P> & { command?: string } {
      const result = parseCore(state, args, false);
      if (result instanceof Promise) {
        throw new BargsError(
          'Async transform or handler detected. Use parseAsync() instead of parse().',
        );
      }
      return result as ParseResult<V, P> & { command?: string };
    },

    async parseAsync(
      args: string[] = process.argv.slice(2),
    ): Promise<ParseResult<V, P> & { command?: string }> {
      return parseCore(state, args, true) as Promise<
        ParseResult<V, P> & { command?: string }
      >;
    },
  };
};

/**
 * Core parse logic shared between parse() and parseAsync().
 */
const parseCore = (
  state: InternalCliState,
  args: string[],
  allowAsync: boolean,
):
  | (ParseResult<unknown, readonly unknown[]> & { command?: string })
  | Promise<
      ParseResult<unknown, readonly unknown[]> & { command?: string }
    > => {
  const { commands, options, theme } = state;

  // Handle --help
  if (args.includes('--help') || args.includes('-h')) {
    // Check for command-specific help
    const helpIndex = args.findIndex((a) => a === '--help' || a === '-h');
    const commandIndex = args.findIndex((a) => !a.startsWith('-'));

    if (commandIndex >= 0 && commandIndex < helpIndex && commands.size > 0) {
      const commandName = args[commandIndex]!;
      if (commands.has(commandName)) {
        console.log(generateCommandHelpNew(state, commandName, theme));
        process.exit(0);
      }
    }

    console.log(generateHelpNew(state, theme));
    process.exit(0);
  }

  // Handle --version
  if (args.includes('--version') && options.version) {
    console.log(options.version);
    process.exit(0);
  }

  // If we have commands, dispatch to the appropriate one
  if (commands.size > 0) {
    return runWithCommands(state, args, allowAsync);
  }

  // Simple CLI (no commands)
  return runSimple(state, args, allowAsync);
};

/**
 * Generate command-specific help.
 */
const generateCommandHelpNew = (
  state: InternalCliState,
  commandName: string,
  theme: Theme,
): string => {
  const commandEntry = state.commands.get(commandName);
  if (!commandEntry) {
    return `Unknown command: ${commandName}`;
  }

  // TODO: Implement proper command help generation
  const config = {
    commands: {
      [commandName]: {
        description: commandEntry.description ?? '',
        options: commandEntry.cmd.__optionsSchema,
        positionals: commandEntry.cmd.__positionalsSchema,
      },
    },
    name: state.name,
  };
  return generateCommandHelp(
    config as Parameters<typeof generateCommandHelp>[0],
    commandName,
    theme,
  );
};

/**
 * Generate help for the new CLI structure.
 */
const generateHelpNew = (state: InternalCliState, theme: Theme): string => {
  // TODO: Implement proper help generation for new structure
  // For now, delegate to existing help generator with minimal config
  const config = {
    commands: Object.fromEntries(
      Array.from(state.commands.entries()).map(([name, { description }]) => [
        name,
        { description: description ?? '' },
      ]),
    ),
    description: state.options.description,
    name: state.name,
    options: state.globalParser?.__optionsSchema,
    version: state.options.version,
  };
  return generateHelp(config as Parameters<typeof generateHelp>[0], theme);
};

/**
 * Check if something is a Parser (has __brand: 'Parser'). Parsers can be either
 * objects or functions (CallableParser).
 */
const isParser = (x: unknown): x is Parser<unknown, readonly unknown[]> => {
  if (x === null || x === undefined) {
    return false;
  }
  // Handle both plain objects and functions with Parser properties
  const obj = x as Record<string, unknown>;
  return '__brand' in obj && obj.__brand === 'Parser';
};

/**
 * Run a simple CLI (no commands).
 */
const runSimple = (
  state: InternalCliState,
  args: string[],
  allowAsync: boolean,
):
  | (ParseResult<unknown, readonly unknown[]> & { command?: string })
  | Promise<
      ParseResult<unknown, readonly unknown[]> & { command?: string }
    > => {
  const { globalParser } = state;

  const optionsSchema = globalParser?.__optionsSchema ?? {};
  const positionalsSchema = globalParser?.__positionalsSchema ?? [];

  const parsed = parseSimple({
    args,
    options: optionsSchema,
    positionals: positionalsSchema,
  });

  let result: ParseResult<unknown, readonly unknown[]> = {
    positionals: parsed.positionals,
    values: parsed.values,
  };

  // Apply transforms if any
  const transform = (
    globalParser as {
      __transform?: (
        r: ParseResult<unknown, readonly unknown[]>,
      ) =>
        | ParseResult<unknown, readonly unknown[]>
        | Promise<ParseResult<unknown, readonly unknown[]>>;
    }
  )?.__transform;

  if (transform) {
    const transformed = transform(result);
    if (transformed instanceof Promise) {
      if (!allowAsync) {
        throw new BargsError(
          'Async transform detected. Use parseAsync() instead of parse().',
        );
      }
      return transformed.then(
        (
          r,
        ): ParseResult<unknown, readonly unknown[]> & { command?: string } => ({
          ...r,
          command: undefined,
        }),
      );
    }
    result = transformed;
  }

  return { ...result, command: undefined };
};

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Run a CLI with commands.
 */
const runWithCommands = (
  state: InternalCliState,
  args: string[],
  allowAsync: boolean,
):
  | (ParseResult<unknown, readonly unknown[]> & { command?: string })
  | Promise<
      ParseResult<unknown, readonly unknown[]> & { command?: string }
    > => {
  const { commands, defaultCommandName, globalParser } = state;

  // Find command name (first non-flag argument)
  const commandIndex = args.findIndex((arg) => !arg.startsWith('-'));
  const potentialCommandName =
    commandIndex >= 0 ? args[commandIndex] : undefined;

  // Check if it's a known command
  let commandName: string | undefined;
  let remainingArgs: string[];

  if (potentialCommandName && commands.has(potentialCommandName)) {
    // It's a known command - remove it from args
    commandName = potentialCommandName;
    remainingArgs = [
      ...args.slice(0, commandIndex),
      ...args.slice(commandIndex + 1),
    ];
  } else if (defaultCommandName) {
    // Not a known command, but we have a default - use all args as positionals/options
    commandName = defaultCommandName;
    remainingArgs = args;
  } else if (potentialCommandName) {
    // Not a known command and no default
    throw new HelpError(`Unknown command: ${potentialCommandName}`);
  } else {
    // No command and no default
    throw new HelpError('No command specified.');
  }

  const commandEntry = commands.get(commandName);
  if (!commandEntry) {
    throw new HelpError(`Unknown command: ${commandName}`);
  }

  const { cmd } = commandEntry;

  // Merge global and command options schemas
  const globalOptionsSchema = globalParser?.__optionsSchema ?? {};
  const commandOptionsSchema = cmd.__optionsSchema;
  const mergedOptionsSchema = {
    ...globalOptionsSchema,
    ...commandOptionsSchema,
  };
  const commandPositionalsSchema = cmd.__positionalsSchema;

  // Parse with merged schema
  const parsed = parseSimple({
    args: remainingArgs,
    options: mergedOptionsSchema,
    positionals: commandPositionalsSchema,
  });

  let result: ParseResult<unknown, readonly unknown[]> = {
    positionals: parsed.positionals,
    values: parsed.values,
  };

  // Helper to check for async and throw if not allowed
  const checkAsync = (value: unknown, context: string): void => {
    if (value instanceof Promise && !allowAsync) {
      throw new BargsError(
        `Async ${context} detected. Use parseAsync() instead of parse().`,
      );
    }
  };

  // Get transforms
  const globalTransform = (
    globalParser as {
      __transform?: (
        r: ParseResult<unknown, readonly unknown[]>,
      ) =>
        | ParseResult<unknown, readonly unknown[]>
        | Promise<ParseResult<unknown, readonly unknown[]>>;
    }
  )?.__transform;

  const commandTransform = (
    cmd as {
      __transform?: (
        r: ParseResult<unknown, readonly unknown[]>,
      ) =>
        | ParseResult<unknown, readonly unknown[]>
        | Promise<ParseResult<unknown, readonly unknown[]>>;
    }
  )?.__transform;

  // Apply transforms and run handler
  const applyTransformsAndHandle = ():
    | (ParseResult<unknown, readonly unknown[]> & { command?: string })
    | Promise<
        ParseResult<unknown, readonly unknown[]> & { command?: string }
      > => {
    // Apply global transforms first
    if (globalTransform) {
      const transformed = globalTransform(result);
      checkAsync(transformed, 'global transform');
      if (transformed instanceof Promise) {
        return transformed.then(
          (r: ParseResult<unknown, readonly unknown[]>) => {
            result = r;
            return continueWithCommandTransform();
          },
        );
      }
      result = transformed;
    }
    return continueWithCommandTransform();
  };

  const continueWithCommandTransform = ():
    | (ParseResult<unknown, readonly unknown[]> & { command?: string })
    | Promise<
        ParseResult<unknown, readonly unknown[]> & { command?: string }
      > => {
    // Apply command transforms
    if (commandTransform) {
      const transformed = commandTransform(result);
      checkAsync(transformed, 'command transform');
      if (transformed instanceof Promise) {
        return transformed.then(
          (r: ParseResult<unknown, readonly unknown[]>) => {
            result = r;
            return runHandler();
          },
        );
      }
      result = transformed;
    }
    return runHandler();
  };

  const runHandler = ():
    | (ParseResult<unknown, readonly unknown[]> & { command?: string })
    | Promise<
        ParseResult<unknown, readonly unknown[]> & { command?: string }
      > => {
    const handlerResult = cmd.handler(result);
    checkAsync(handlerResult, 'handler');
    if (handlerResult instanceof Promise) {
      return handlerResult.then(() => ({ ...result, command: commandName }));
    }
    return { ...result, command: commandName };
  };

  return applyTransformsAndHandle();
};

/**
 * Main bargs namespace.
 */
export const bargs = {
  create,
};
