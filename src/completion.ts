/**
 * Shell completion script generation for bargs CLIs.
 *
 * Provides dynamic shell completion support for bash, zsh, and fish shells. The
 * generated scripts call back to the CLI to get completion candidates.
 *
 * @packageDocumentation
 */

import type { OptionDef, OptionsSchema, PositionalsSchema } from './types.js';

/**
 * Supported shell types for completion script generation.
 *
 * @group Completion
 */
export type Shell = 'bash' | 'fish' | 'zsh';

/**
 * Command metadata for completion.
 */
interface CommandCompletionInfo {
  /** Alternative names for this command */
  aliases: string[];
  /** Command description for help text */
  description?: string;
  /** Canonical command name */
  name: string;
  /** Nested CLI builder for subcommands */
  nestedBuilder?: unknown;
  /** Options specific to this command */
  options: OptionCompletionInfo[];
  /** Positional arguments for this command */
  positionals: PositionalCompletionInfo[];
}

/**
 * Command entry in internal state.
 */
type CommandEntry =
  | {
      /** Alternative names for this command */
      aliases?: string[];
      /** Command definition with schemas */
      cmd: {
        /** Options schema for this command */
        __optionsSchema: OptionsSchema;
        /** Positionals schema for this command */
        __positionalsSchema: PositionalsSchema;
      };
      /** Command description for help text */
      description?: string;
      /** Discriminator for leaf commands */
      type: 'command';
    }
  | {
      /** Alternative names for this command */
      aliases?: string[];
      /** Nested CLI builder for subcommands */
      builder: unknown;
      /** Command description for help text */
      description?: string;
      /** Discriminator for nested command groups */
      type: 'nested';
    };

/**
 * Internal metadata structure for completion generation.
 */
interface CompletionMetadata {
  /** Map of command names to their completion metadata */
  commands: Map<string, CommandCompletionInfo>;
  /** Global options available to all commands */
  globalOptions: OptionCompletionInfo[];
  /** CLI executable name */
  name: string;
}

/**
 * Internal CLI builder with state access (mirrors InternalCliBuilder from
 * bargs.ts).
 */
interface InternalBuilder {
  /** Get the internal CLI state for completion traversal */
  __getState: () => InternalCliState;
}

/**
 * Internal CLI state structure (matches bargs.ts InternalCliState).
 */
interface InternalCliState {
  /** Map of command aliases to canonical command names */
  aliasMap: Map<string, string>;
  /** Map of command names to their entries */
  commands: Map<string, CommandEntry>;
  /** Global parser with options and positionals schemas */
  globalParser?: {
    /** Global options schema */
    __optionsSchema: OptionsSchema;
    /** Global positionals schema */
    __positionalsSchema: PositionalsSchema;
  };
  /** CLI executable name */
  name: string;
}

/**
 * Option metadata for completion.
 */
interface OptionCompletionInfo {
  /** Alternative names for this option (e.g., `-v` for `--verbose`) */
  aliases: string[];
  /** Valid values for enum options */
  choices?: readonly string[];
  /** Option description for help text */
  description?: string;
  /** Option name including `--` prefix (e.g., `--verbose`) */
  name: string;
  /** Whether this option requires a value argument */
  takesValue: boolean;
  /** Option type (string, boolean, number, enum, array, count) */
  type: string;
}

/**
 * Result from option value candidate lookup.
 */
interface OptionValueResult {
  /** The completion candidates (may be empty to allow file completion) */
  candidates: string[];
  /** Whether we found a matching option that takes a value */
  found: boolean;
}

/**
 * Positional metadata for completion.
 */
interface PositionalCompletionInfo {
  /** Valid values for enum positionals */
  choices?: readonly string[];
  /** Positional description for help text */
  description?: string;
  /** Display name for this positional */
  name: string;
  /** Positional type (string, number, enum, variadic) */
  type: string;
}

/**
 * Sanitize a CLI name for use as a shell function name.
 *
 * Ensures the result is a valid POSIX identifier: starts with a letter or
 * underscore, contains only alphanumeric characters and underscores.
 *
 * @function
 * @param name - The CLI name to sanitize
 * @returns A valid shell function name
 */
const sanitizeFunctionName = (name: string): string => {
  // Replace any non-alphanumeric character with underscore
  let sanitized = name.replace(/[^a-zA-Z0-9]/g, '_');

  // Collapse multiple consecutive underscores
  sanitized = sanitized.replace(/_+/g, '_');

  // Remove leading/trailing underscores
  sanitized = sanitized.replace(/^_+|_+$/g, '');

  // Ensure it starts with a letter or underscore (not a digit)
  if (/^[0-9]/.test(sanitized)) {
    sanitized = `_${sanitized}`;
  }

  // Fallback for empty result
  if (!sanitized) {
    sanitized = 'cli';
  }

  return sanitized;
};

/**
 * Generate bash completion script.
 *
 * @function
 */
const generateBashScript = (cliName: string): string => {
  const funcName = `_${sanitizeFunctionName(cliName)}_completions`;

  return `# bash completion for ${cliName}
# Add to ~/.bashrc or ~/.bash_profile:
#   source <(${cliName} --completion-script bash)
# Or:
#   ${cliName} --completion-script bash >> ~/.bashrc

${funcName}() {
    local IFS=$'\\n'
    local cur="\${COMP_WORDS[COMP_CWORD]}"
    
    # Call CLI to get completions
    local completions
    completions=($("${cliName}" --get-bargs-completions bash "\${COMP_WORDS[@]}"))
    
    # Filter by current word prefix
    COMPREPLY=($(compgen -W "\${completions[*]}" -- "\${cur}"))
    
    # Fall back to file completion if no matches and not completing an option
    if [[ \${#COMPREPLY[@]} -eq 0 && "\${cur}" != -* ]]; then
        compopt -o default
    fi
}

complete -o default -F ${funcName} ${cliName}
`;
};

/**
 * Generate zsh completion script.
 *
 * @function
 */
const generateZshScript = (cliName: string): string => {
  const funcName = `_${sanitizeFunctionName(cliName)}`;

  return `#compdef ${cliName}
# zsh completion for ${cliName}
# Add to ~/.zshrc:
#   source <(${cliName} --completion-script zsh)
# Or save to a file in your $fpath:
#   ${cliName} --completion-script zsh > ~/.zsh/completions/_${cliName}

${funcName}() {
    local completions
    
    # Call CLI to get completions with descriptions
    completions=("\${(@f)$("${cliName}" --get-bargs-completions zsh "\${words[@]}")}")
    
    if [[ \${#completions[@]} -gt 0 && -n "\${completions[1]}" ]]; then
        # Check if completions have descriptions (format: "value:description")
        if [[ "\${completions[1]}" == *":"* ]]; then
            _describe 'completions' completions
        else
            compadd -a completions
        fi
    fi
}

compdef ${funcName} ${cliName}
`;
};

/**
 * Generate fish completion script.
 *
 * @function
 */
const generateFishScript = (cliName: string): string => {
  const funcName = `__fish_${sanitizeFunctionName(cliName)}_complete`;

  return `# fish completion for ${cliName}
# Save to ~/.config/fish/completions/${cliName}.fish:
#   ${cliName} --completion-script fish > ~/.config/fish/completions/${cliName}.fish

function ${funcName}
    set -l tokens (commandline -opc)
    ${cliName} --get-bargs-completions fish $tokens
end

# Disable file completions by default, let the CLI decide
complete -c ${cliName} -f -a '(${funcName})'
`;
};

/**
 * Generate a shell completion script for the given CLI.
 *
 * The generated script calls back to the CLI with `--get-bargs-completions` to
 * get completion candidates dynamically.
 *
 * @example
 *
 * ```typescript
 * // Output script for bash
 * console.log(generateCompletionScript('mytool', 'bash'));
 * // Redirect to shell config: mytool --completion-script bash >> ~/.bashrc
 * ```
 *
 * @function
 * @param cliName - The name of the CLI executable
 * @param shell - The target shell ('bash', 'zsh', or 'fish')
 * @returns The completion script as a string
 * @group Completion
 */
export const generateCompletionScript = (
  cliName: string,
  shell: Shell,
): string => {
  switch (shell) {
    case 'bash':
      return generateBashScript(cliName);
    case 'fish':
      return generateFishScript(cliName);
    case 'zsh':
      return generateZshScript(cliName);
    default:
      throw new Error(`Unsupported shell: ${shell as string}`);
  }
};

/**
 * Extract completion metadata from internal CLI state.
 *
 * @function
 */
const extractCompletionMetadata = (
  state: InternalCliState,
): CompletionMetadata => {
  const globalOptions = extractOptionsInfo(
    state.globalParser?.__optionsSchema ?? {},
  );

  const commands = new Map<string, CommandCompletionInfo>();
  for (const [name, entry] of state.commands) {
    // Skip the internal default command marker
    if (name === '__default__') {
      continue;
    }

    if (entry.type === 'command') {
      commands.set(name, {
        aliases: entry.aliases ?? [],
        description: entry.description,
        name,
        options: extractOptionsInfo(entry.cmd.__optionsSchema),
        positionals: extractPositionalsInfo(entry.cmd.__positionalsSchema),
      });
    } else if (entry.type === 'nested') {
      commands.set(name, {
        aliases: entry.aliases ?? [],
        description: entry.description,
        name,
        nestedBuilder: entry.builder,
        options: [],
        positionals: [],
      });
    }
  }

  return {
    commands,
    globalOptions,
    name: state.name,
  };
};

/**
 * Check if a value is an internal builder with __getState method.
 *
 * @function
 */
const isInternalBuilder = (value: unknown): value is InternalBuilder => {
  return (
    typeof value === 'object' &&
    value !== null &&
    '__getState' in value &&
    typeof (value as InternalBuilder).__getState === 'function'
  );
};

/**
 * Extract metadata from a nested builder.
 *
 * @function
 */
const extractNestedMetadata = (
  nestedBuilder: unknown,
): CompletionMetadata | undefined => {
  if (!isInternalBuilder(nestedBuilder)) {
    return undefined;
  }
  return extractCompletionMetadata(nestedBuilder.__getState());
};

/**
 * Extract option info from options schema.
 *
 * @function
 */
const extractOptionsInfo = (schema: OptionsSchema): OptionCompletionInfo[] => {
  const options: OptionCompletionInfo[] = [];

  for (const [name, def] of Object.entries(schema)) {
    // Skip hidden options
    if ((def as { hidden?: boolean }).hidden) {
      continue;
    }

    const aliases: string[] = [];
    if ('aliases' in def && Array.isArray(def.aliases)) {
      for (const alias of def.aliases) {
        if (alias.length === 1) {
          aliases.push(`-${alias}`);
        } else {
          aliases.push(`--${alias}`);
        }
      }
    }

    options.push({
      aliases,
      choices: getChoices(def),
      description: def.description,
      name: `--${name}`,
      takesValue: def.type !== 'boolean' && def.type !== 'count',
      type: def.type,
    });

    // Add --no-<name> for boolean options
    if (def.type === 'boolean') {
      options.push({
        aliases: [],
        description: def.description ? `Disable ${def.description}` : undefined,
        name: `--no-${name}`,
        takesValue: false,
        type: 'boolean',
      });
    }
  }

  return options;
};

/**
 * Extract positional info from positionals schema.
 *
 * @function
 */
const extractPositionalsInfo = (
  schema: PositionalsSchema,
): PositionalCompletionInfo[] =>
  schema.map((pos) => ({
    choices: getChoices(pos as OptionDef),
    description: pos.description,
    name: pos.name ?? 'arg',
    type: pos.type,
  }));

/**
 * Get choices from an option or positional definition.
 *
 * @function
 */
const getChoices = (def: OptionDef): readonly string[] | undefined => {
  if ('choices' in def && Array.isArray(def.choices)) {
    return def.choices as readonly string[];
  }
  return undefined;
};

/**
 * Result of command context analysis.
 */
interface CommandContextResult {
  /** Accumulated global options from all parent levels */
  accumulatedOptions: OptionCompletionInfo[];
  /** Available subcommands at the current level */
  availableCommands: CommandCompletionInfo[];
  /** The current leaf command (if we've reached one) */
  currentCommand?: CommandCompletionInfo;
  /** Whether we need a command/subcommand to be specified */
  needsCommand: boolean;
  /** Index of the next positional argument for the current command */
  positionalIndex: number;
}

/**
 * Find a command by name or alias in the metadata.
 *
 * @function
 */
const findCommand = (
  metadata: CompletionMetadata,
  name: string,
): CommandCompletionInfo | undefined => {
  // Try direct match
  const direct = metadata.commands.get(name);
  if (direct) {
    return direct;
  }

  // Try alias match
  for (const [, cmd] of metadata.commands) {
    if (cmd.aliases.includes(name)) {
      return cmd;
    }
  }

  return undefined;
};

/**
 * Analyze command context from args, recursively handling nested commands.
 *
 * @function
 */
const getCommandContext = (
  metadata: CompletionMetadata,
  args: string[],
  accumulatedOptions: OptionCompletionInfo[] = [],
): CommandContextResult => {
  // Accumulate global options from this level
  const options = [...accumulatedOptions, ...metadata.globalOptions];

  if (metadata.commands.size === 0) {
    return {
      accumulatedOptions: options,
      availableCommands: [],
      needsCommand: false,
      positionalIndex: 0,
    };
  }

  // Find the first non-option argument (potential command)
  // Note: The last arg is the current word being completed, so we don't count it
  // as a completed positional
  let commandName: string | undefined;
  let commandArgIndex = -1;

  // Process all args except the last one (which is being completed)
  const completedArgs = args.slice(0, -1);

  for (let i = 0; i < completedArgs.length; i++) {
    const arg = completedArgs[i]!;
    if (!arg.startsWith('-')) {
      // First non-option is the command at this level
      commandName = arg;
      commandArgIndex = i;
      break;
    }
  }

  // Check if the command name matches a known command or alias
  if (commandName) {
    const cmd = findCommand(metadata, commandName);

    if (cmd) {
      // Check if this is a nested command - if so, recurse
      if (cmd.nestedBuilder) {
        const nestedMetadata = extractNestedMetadata(cmd.nestedBuilder);
        if (nestedMetadata) {
          // Get remaining args after this command
          const remainingArgs = completedArgs.slice(commandArgIndex + 1);
          // Add the current word being completed
          if (args.length > 0) {
            remainingArgs.push(args[args.length - 1]!);
          }
          return getCommandContext(nestedMetadata, remainingArgs, options);
        }
      }

      // It's a leaf command - calculate positional index
      let positionalIndex = 0;
      for (let i = commandArgIndex + 1; i < completedArgs.length; i++) {
        const arg = completedArgs[i]!;
        if (!arg.startsWith('-')) {
          positionalIndex++;
        }
      }

      return {
        accumulatedOptions: options,
        availableCommands: [],
        currentCommand: cmd,
        needsCommand: false,
        positionalIndex,
      };
    }
  }

  // No valid command yet at this level - need to show available commands
  return {
    accumulatedOptions: options,
    availableCommands: Array.from(metadata.commands.values()),
    needsCommand: true,
    positionalIndex: 0,
  };
};

/**
 * Get all options available in the current context.
 *
 * @function
 */
const getAllOptionsForContext = (
  metadata: CompletionMetadata,
  args: string[],
): OptionCompletionInfo[] => {
  // getCommandContext now accumulates global options from all parent levels
  const commandContext = getCommandContext(metadata, args);

  // Start with accumulated options (includes all global options from parent levels)
  const options = [...commandContext.accumulatedOptions];

  // Add command-specific options if we're in a leaf command
  if (commandContext.currentCommand) {
    options.push(...commandContext.currentCommand.options);
  }

  return options;
};

/**
 * Format candidates for shell output.
 *
 * @function
 */
const formatCandidates = (
  candidates: Array<{ description?: string; value: string }>,
  shell: Shell,
): string[] => {
  switch (shell) {
    case 'fish':
      // fish supports descriptions with tab separator
      return candidates.map((c) =>
        c.description ? `${c.value}\t${c.description}` : c.value,
      );
    case 'zsh':
      // zsh supports descriptions in format "value:description"
      return candidates.map((c) =>
        c.description ? `${c.value}:${c.description}` : c.value,
      );
    case 'bash':
    default:
      // bash doesn't support descriptions in basic completion
      return candidates.map((c) => c.value);
  }
};

/**
 * Get command candidates.
 *
 * @function
 */
const getCommandCandidates = (
  commands: CommandCompletionInfo[],
  _currentWord: string,
  shell: Shell,
): string[] => {
  const candidates: Array<{ description?: string; value: string }> = [];

  for (const cmd of commands) {
    candidates.push({ description: cmd.description, value: cmd.name });
    for (const alias of cmd.aliases) {
      candidates.push({
        description: cmd.description ? `(alias) ${cmd.description}` : '(alias)',
        value: alias,
      });
    }
  }

  return formatCandidates(candidates, shell);
};

/**
 * Get option candidates.
 *
 * @function
 */
const getOptionCandidates = (
  metadata: CompletionMetadata,
  args: string[],
  shell: Shell,
): string[] => {
  const allOptions = getAllOptionsForContext(metadata, args);
  const candidates: Array<{ description?: string; value: string }> = [];

  for (const opt of allOptions) {
    candidates.push({ description: opt.description, value: opt.name });
    for (const alias of opt.aliases) {
      candidates.push({ description: opt.description, value: alias });
    }
  }

  return formatCandidates(candidates, shell);
};

/**
 * Get candidates for option values (enum choices).
 *
 * @function
 */
const getOptionValueCandidates = (
  metadata: CompletionMetadata,
  prevWord: string,
  args: string[],
  shell: Shell,
): OptionValueResult => {
  // Find the option definition
  const allOptions = getAllOptionsForContext(metadata, args);

  for (const opt of allOptions) {
    if (opt.name === prevWord || opt.aliases.includes(prevWord)) {
      if (opt.choices && opt.choices.length > 0) {
        return {
          candidates: formatCandidates(
            opt.choices.map((c) => ({ description: undefined, value: c })),
            shell,
          ),
          found: true,
        };
      }
      // Option takes a value but no specific choices - let shell do file completion
      if (opt.takesValue) {
        return { candidates: [], found: true };
      }
      // Boolean/count option - doesn't take a value, so prev word isn't an option expecting a value
      return { candidates: [], found: false };
    }
  }

  // Option not found
  return { candidates: [], found: false };
};

/**
 * Get positional candidates (for enum positionals).
 *
 * @function
 */
const getPositionalCandidates = (
  command: CommandCompletionInfo,
  positionalIndex: number,
  shell: Shell,
): string[] => {
  if (positionalIndex >= command.positionals.length) {
    // Check for variadic last positional
    const lastPos = command.positionals[command.positionals.length - 1];
    if (lastPos?.type !== 'variadic') {
      return [];
    }
    // Use the variadic positional's choices if any
    if (lastPos.choices && lastPos.choices.length > 0) {
      return formatCandidates(
        lastPos.choices.map((c) => ({ description: undefined, value: c })),
        shell,
      );
    }
    return [];
  }

  const pos = command.positionals[positionalIndex];
  if (!pos || !pos.choices || pos.choices.length === 0) {
    return [];
  }

  return formatCandidates(
    pos.choices.map((c) => ({ description: undefined, value: c })),
    shell,
  );
};

/**
 * Get completion candidates for the current command line state.
 *
 * Analyzes the provided words to determine context and returns appropriate
 * completion suggestions.
 *
 * @function
 * @param state - Internal CLI state containing commands and options
 * @param shell - The shell requesting completions (affects output format)
 * @param words - The command line words (COMP_WORDS in bash)
 * @returns Array of completion candidates (one per line when output)
 * @group Completion
 */
export const getCompletionCandidates = (
  state: InternalCliState,
  shell: Shell,
  words: string[],
): string[] => {
  const metadata = extractCompletionMetadata(state);

  // Remove the CLI name from words if present
  const args = words.length > 1 ? words.slice(1) : [];
  const currentWord = args.length > 0 ? (args[args.length - 1] ?? '') : '';
  const prevWord = args.length > 1 ? args[args.length - 2] : undefined;

  // Check if we're completing an option value
  if (prevWord?.startsWith('-')) {
    const result = getOptionValueCandidates(metadata, prevWord, args, shell);
    // If we found the option and it takes a value, return the result
    // (which may be empty to allow file completion)
    if (result.found) {
      return result.candidates;
    }
  }

  // Check if current word is an option
  if (currentWord.startsWith('-')) {
    return getOptionCandidates(metadata, args, shell);
  }

  // Check if we need to complete a command
  const commandContext = getCommandContext(metadata, args);
  if (commandContext.needsCommand) {
    return getCommandCandidates(
      commandContext.availableCommands,
      currentWord,
      shell,
    );
  }

  // Check if we're in a command and need positional completion
  if (commandContext.currentCommand) {
    const positionalCandidates = getPositionalCandidates(
      commandContext.currentCommand,
      commandContext.positionalIndex,
      shell,
    );
    if (positionalCandidates.length > 0) {
      return positionalCandidates;
    }
  }

  // Default: offer commands if we have them, or options
  if (metadata.commands.size > 0) {
    return getCommandCandidates(
      Array.from(metadata.commands.values()),
      currentWord,
      shell,
    );
  }

  return getOptionCandidates(metadata, args, shell);
};

/**
 * Validate that a shell name is supported.
 *
 * @function
 * @param shell - The shell name to validate
 * @returns The validated shell type
 * @throws Error if the shell is not supported
 * @group Completion
 */
export const validateShell = (shell: string): Shell => {
  if (shell === 'bash' || shell === 'zsh' || shell === 'fish') {
    return shell;
  }
  throw new Error(
    `Unsupported shell: "${shell}". Supported shells: bash, zsh, fish`,
  );
};
