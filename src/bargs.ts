/**
 * Core bargs API using parser combinator pattern.
 *
 * Provides `bargs.create()` for building CLIs with a fluent API, plus
 * combinator functions like `pipe()`, `map()`, and `handle()`.
 *
 * @packageDocumentation
 */

import type {
  CamelCaseKeys,
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
// A command entry can be either a leaf command or a nested builder
type CommandEntry =
  | {
      builder: CliBuilder<unknown, readonly unknown[]>;
      description?: string;
      type: 'nested';
    }
  | {
      cmd: Command<unknown, readonly unknown[]>;
      description?: string;
      type: 'command';
    };
// Type for commands that may have transforms
type CommandWithTransform<V, P extends readonly unknown[]> = Command<V, P> & {
  __transform?: (
    r: ParseResult<unknown, readonly unknown[]>,
  ) => ParseResult<V, P>;
};

interface InternalCliState {
  commands: Map<string, CommandEntry>;
  defaultCommandName?: string;
  globalParser?: Parser<unknown, readonly unknown[]>;
  name: string;
  options: CreateOptions;
  parentGlobals?: ParseResult<unknown, readonly unknown[]>;
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
  // Helper to compose transforms (chains existing + new)
  /**
   * @function
   */
  const composeTransform = (
    parser: Parser<V1, P1>,
    fn: TransformFn<V1, P1, V2, P2>,
  ): TransformFn<unknown, readonly unknown[], V2, P2> => {
    const existing = (
      parser as {
        __transform?: (
          r: ParseResult<unknown, readonly unknown[]>,
        ) => ParseResult<V1, P1> | Promise<ParseResult<V1, P1>>;
      }
    ).__transform;

    if (!existing) {
      return fn as TransformFn<unknown, readonly unknown[], V2, P2>;
    }

    // Chain: existing transform first, then new transform
    return (r: ParseResult<unknown, readonly unknown[]>) => {
      const r1 = existing(r);
      if (r1 instanceof Promise) {
        return r1.then(fn);
      }
      return fn(r1);
    };
  };

  // Direct form: map(parser, fn) returns Parser
  // Check for Parser first since CallableParser is also a function
  if (isParser(parserOrFn)) {
    const parser = parserOrFn;
    const fn = maybeFn!;
    const composedTransform = composeTransform(parser, fn);
    return {
      ...parser,
      __brand: 'Parser',
      __positionals: [] as unknown as P2,
      __transform: composedTransform,
      __values: {} as V2,
    } as Parser<V2, P2> & { __transform: typeof composedTransform };
  }

  // Curried form: map(fn) returns (parser) => Parser
  const fn = parserOrFn;
  return (parser: Parser<V1, P1>): Parser<V2, P2> => {
    const composedTransform = composeTransform(parser, fn);
    return {
      ...parser,
      __brand: 'Parser',
      __positionals: [] as unknown as P2,
      __transform: composedTransform,
      __values: {} as V2,
    } as Parser<V2, P2> & { __transform: typeof composedTransform };
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
// CAMEL CASE HELPER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Convert kebab-case string to camelCase.
 *
 * @function
 */
const kebabToCamel = (s: string): string =>
  s.replace(/-([a-zA-Z])/g, (_, c: string) => c.toUpperCase());

/**
 * Transform for use with `map()` that converts kebab-case option keys to
 * camelCase.
 *
 * @example
 *
 * ```typescript
 * import { bargs, opt, map, camelCaseValues } from '@boneskull/bargs';
 *
 * const { values } = await bargs
 *   .create('my-cli')
 *   .globals(
 *     map(opt.options({ 'output-dir': opt.string() }), camelCaseValues),
 *   )
 *   .parseAsync();
 *
 * console.log(values.outputDir); // camelCased!
 * ```
 *
 * @function
 */
export const camelCaseValues = <V, P extends readonly unknown[]>(
  result: ParseResult<V, P>,
): ParseResult<CamelCaseKeys<V>, P> => ({
  ...result,
  values: Object.fromEntries(
    Object.entries(result.values as Record<string, unknown>).map(([k, v]) => [
      kebabToCamel(k),
      v,
    ]),
  ) as CamelCaseKeys<V>,
});

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
 *
 * @function
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
 *
 * @function
 */
const isCommand = (x: unknown): x is Command<unknown, readonly unknown[]> => {
  if (x === null || x === undefined) {
    return false;
  }
  const obj = x as Record<string, unknown>;
  return '__brand' in obj && obj.__brand === 'Command';
};

// Internal type for CliBuilder with internal methods
type InternalCliBuilder<V, P extends readonly unknown[]> = CliBuilder<V, P> & {
  __parseWithParentGlobals: (
    args: string[],
    parentGlobals: ParseResult<unknown, readonly unknown[]>,
    allowAsync: boolean,
  ) =>
    | (ParseResult<V, P> & { command?: string })
    | Promise<ParseResult<V, P> & { command?: string }>;
};

/**
 * Create a CLI builder.
 *
 * @function
 */
const createCliBuilder = <V, P extends readonly unknown[]>(
  state: InternalCliState,
): CliBuilder<V, P> => {
  const builder: InternalCliBuilder<V, P> = {
    // Internal method for nested command support - not part of public API
    __parseWithParentGlobals(
      args: string[],
      parentGlobals: ParseResult<unknown, readonly unknown[]>,
      allowAsync: boolean,
    ):
      | (ParseResult<V, P> & { command?: string })
      | Promise<ParseResult<V, P> & { command?: string }> {
      const stateWithGlobals = { ...state, parentGlobals };
      return parseCore(stateWithGlobals, args, allowAsync) as
        | (ParseResult<V, P> & { command?: string })
        | Promise<ParseResult<V, P> & { command?: string }>;
    },

    // Overloaded command(): accepts (name, Command, desc?), (name, Parser, handler, desc?), or (name, CliBuilder, desc?)
    command<CV, CP extends readonly unknown[]>(
      name: string,
      cmdOrParserOrBuilder:
        | CliBuilder<CV, CP>
        | Command<CV, CP>
        | Parser<CV, CP>,
      handlerOrDesc?: HandlerFn<CV & V, CP> | string,
      maybeDesc?: string,
    ): CliBuilder<V, P> {
      // Form 3: command(name, CliBuilder, description?) - nested commands
      if (isCliBuilder(cmdOrParserOrBuilder)) {
        const builder = cmdOrParserOrBuilder;
        const description = handlerOrDesc as string | undefined;
        state.commands.set(name, {
          builder: builder as CliBuilder<unknown, readonly unknown[]>,
          description,
          type: 'nested',
        });
        return this;
      }

      let cmd: Command<unknown, readonly unknown[]>;
      let description: string | undefined;

      if (isCommand(cmdOrParserOrBuilder)) {
        // Form 1: command(name, Command, description?)
        cmd = cmdOrParserOrBuilder;
        description = handlerOrDesc as string | undefined;
      } else if (isParser(cmdOrParserOrBuilder)) {
        // Form 2: command(name, Parser, handler, description?)
        const parser = cmdOrParserOrBuilder;
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
          'command() requires a Command, Parser, or CliBuilder as second argument',
        );
      }

      state.commands.set(name, { cmd, description, type: 'command' });
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
          type: 'command',
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
          type: 'command',
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

  // Return as public CliBuilder (hiding internal method from type)
  return builder as CliBuilder<V, P>;
};

/**
 * Core parse logic shared between parse() and parseAsync().
 *
 * @function
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
 *
 * @function
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

  // Handle nested commands - show their subcommand list
  if (commandEntry.type === 'nested') {
    // TODO: Generate proper help for nested command groups
    return `${commandName} is a command group. Run '${state.name} ${commandName} --help' for subcommands.`;
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
 *
 * @function
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
 *
 * @function
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
 * Check if something is a CliBuilder (has command, globals, parse, parseAsync
 * methods).
 *
 * @function
 */
const isCliBuilder = (
  x: unknown,
): x is CliBuilder<unknown, readonly unknown[]> => {
  if (x === null || x === undefined || typeof x !== 'object') {
    return false;
  }
  const obj = x as Record<string, unknown>;
  return (
    typeof obj.command === 'function' &&
    typeof obj.globals === 'function' &&
    typeof obj.parse === 'function' &&
    typeof obj.parseAsync === 'function'
  );
};

/**
 * Run a simple CLI (no commands).
 *
 * @function
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
 * Delegate parsing to a nested CliBuilder, passing down parent globals.
 *
 * @function
 */
const delegateToNestedBuilder = (
  builder: CliBuilder<unknown, readonly unknown[]>,
  remainingArgs: string[],
  parentGlobals: ParseResult<unknown, readonly unknown[]>,
  allowAsync: boolean,
):
  | (ParseResult<unknown, readonly unknown[]> & { command?: string })
  | Promise<
      ParseResult<unknown, readonly unknown[]> & { command?: string }
    > => {
  // Access the internal parse function that accepts parent globals
  const internalBuilder = builder as unknown as {
    __parseWithParentGlobals: (
      args: string[],
      parentGlobals: ParseResult<unknown, readonly unknown[]>,
      allowAsync: boolean,
    ) =>
      | (ParseResult<unknown, readonly unknown[]> & { command?: string })
      | Promise<
          ParseResult<unknown, readonly unknown[]> & { command?: string }
        >;
  };

  return internalBuilder.__parseWithParentGlobals(
    remainingArgs,
    parentGlobals,
    allowAsync,
  );
};

/**
 * Run a CLI with commands.
 *
 * @function
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

  // Handle nested commands (subcommands)
  if (commandEntry.type === 'nested') {
    const { builder } = commandEntry;

    // Parse global options first (before the command name)
    const globalOptionsSchema = globalParser?.__optionsSchema ?? {};
    const globalParsed = parseSimple({
      args: args.slice(0, commandIndex),
      options: globalOptionsSchema,
      positionals: [],
    });

    // Apply global transforms if any
    let globalResult: ParseResult<unknown, readonly unknown[]> = {
      positionals: globalParsed.positionals,
      values: globalParsed.values,
    };

    const globalTransform = (
      globalParser as {
        __transform?: (
          r: ParseResult<unknown, readonly unknown[]>,
        ) =>
          | ParseResult<unknown, readonly unknown[]>
          | Promise<ParseResult<unknown, readonly unknown[]>>;
      }
    )?.__transform;

    // Args for nested builder are ONLY those after the command name (not global options)
    const nestedArgs = args.slice(commandIndex + 1);

    if (globalTransform) {
      const transformed = globalTransform(globalResult);
      if (transformed instanceof Promise) {
        if (!allowAsync) {
          throw new BargsError(
            'Async global transform detected. Use parseAsync() instead of parse().',
          );
        }
        return transformed.then(
          (r: ParseResult<unknown, readonly unknown[]>) => {
            return delegateToNestedBuilder(builder, nestedArgs, r, allowAsync);
          },
        );
      }
      globalResult = transformed;
    }

    return delegateToNestedBuilder(
      builder,
      nestedArgs,
      globalResult,
      allowAsync,
    );
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

  // Merge parent globals (from nested command delegation) with parsed values
  const parentValues =
    (state.parentGlobals?.values as Record<string, unknown> | undefined) ?? {};
  let result: ParseResult<unknown, readonly unknown[]> = {
    positionals: parsed.positionals,
    values: { ...parentValues, ...parsed.values },
  };

  // Helper to check for async and throw if not allowed
  /**
   * @function
   */
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
  /**
   * @function
   */
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

  /**
   * @function
   */
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

  /**
   * @function
   */
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
