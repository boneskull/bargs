// src/types-new.ts

/**
 * Base properties shared by all option definitions.
 */
interface OptionBase {
  /** Option description displayed in help text */
  description?: string;
  /** Aliases for this option (e.g., ['v'] for --verbose) */
  aliases?: string[];
  /** Group name for help text organization */
  group?: string;
  /** Whether this option is required */
  required?: boolean;
  /** Whether this option is hidden from help */
  hidden?: boolean;
}

/**
 * String option definition.
 */
export interface StringOption extends OptionBase {
  type: 'string';
  default?: string;
}

/**
 * Number option definition.
 */
export interface NumberOption extends OptionBase {
  type: 'number';
  default?: number;
}

/**
 * Boolean option definition.
 */
export interface BooleanOption extends OptionBase {
  type: 'boolean';
  default?: boolean;
}

/**
 * Enum option definition with string choices.
 */
export interface EnumOption<T extends string = string> extends OptionBase {
  type: 'enum';
  choices: readonly T[];
  default?: T;
}

/**
 * Array option definition (--flag value --flag value2).
 */
export interface ArrayOption extends OptionBase {
  type: 'array';
  /** Element type of the array */
  items: 'string' | 'number';
  default?: string[] | number[];
}

/**
 * Count option definition (--verbose --verbose = 2).
 */
export interface CountOption extends OptionBase {
  type: 'count';
  default?: number;
}

/**
 * Union of all option definitions.
 */
export type OptionDef =
  | ArrayOption
  | BooleanOption
  | CountOption
  | EnumOption<string>
  | NumberOption
  | StringOption;

/**
 * Options schema: a record of option names to their definitions.
 */
export type OptionsSchema = Record<string, OptionDef>;

/**
 * Base properties for positional definitions.
 */
interface PositionalBase {
  description?: string;
  required?: boolean;
}

/**
 * String positional.
 */
export interface StringPositional extends PositionalBase {
  type: 'string';
  default?: string;
}

/**
 * Number positional.
 */
export interface NumberPositional extends PositionalBase {
  type: 'number';
  default?: number;
}

/**
 * Variadic positional (rest args).
 */
export interface VariadicPositional extends PositionalBase {
  type: 'variadic';
  items: 'string' | 'number';
}

/**
 * Union of positional definitions.
 */
export type PositionalDef = NumberPositional | StringPositional | VariadicPositional;

/**
 * Positionals can be a tuple (ordered) or a single variadic.
 */
export type PositionalsSchema = PositionalDef[];

/**
 * Infer the TypeScript type from an option definition.
 */
export type InferOption<T extends OptionDef> = T extends BooleanOption
  ? T['required'] extends true
    ? boolean
    : T['default'] extends boolean
      ? boolean
      : boolean | undefined
  : T extends NumberOption
    ? T['required'] extends true
      ? number
      : T['default'] extends number
        ? number
        : number | undefined
    : T extends StringOption
      ? T['required'] extends true
        ? string
        : T['default'] extends string
          ? string
          : string | undefined
      : T extends EnumOption<infer E>
        ? T['required'] extends true
          ? E
          : T['default'] extends E
            ? E
            : E | undefined
        : T extends ArrayOption
          ? T['items'] extends 'number'
            ? number[]
            : string[]
          : T extends CountOption
            ? number
            : never;

/**
 * Infer values type from an options schema.
 */
export type InferOptions<T extends OptionsSchema> = {
  [K in keyof T]: InferOption<T[K]>;
};

/**
 * Infer a single positional's type.
 */
export type InferPositional<T extends PositionalDef> = T extends NumberPositional
  ? T['required'] extends true
    ? number
    : T['default'] extends number
      ? number
      : number | undefined
  : T extends StringPositional
    ? T['required'] extends true
      ? string
      : T['default'] extends string
        ? string
        : string | undefined
    : T extends VariadicPositional
      ? T['items'] extends 'number'
        ? number[]
        : string[]
      : never;

/**
 * Infer positionals tuple type from schema.
 */
export type InferPositionals<T extends PositionalsSchema> = {
  [K in keyof T]: T[K] extends PositionalDef ? InferPositional<T[K]> : never;
};

/**
 * Handler function signature.
 */
export type Handler<TResult> = (result: TResult) => Promise<void> | void;

/**
 * Result from parsing CLI arguments.
 */
export interface BargsResult<
  TValues = Record<string, unknown>,
  TPositionals extends readonly unknown[] = [],
  TCommand extends string | undefined = string | undefined,
> {
  command: TCommand;
  positionals: TPositionals;
  values: TValues;
}

/**
 * Command configuration.
 */
export interface CommandConfig<
  TOptions extends OptionsSchema = OptionsSchema,
  TPositionals extends PositionalsSchema = PositionalsSchema,
> {
  description: string;
  options?: TOptions;
  positionals?: TPositionals;
  handler: Handler<
    BargsResult<InferOptions<TOptions>, InferPositionals<TPositionals>, string>
  >;
}

/**
 * Any command config (type-erased for collections).
 */
export type AnyCommandConfig = CommandConfig<OptionsSchema, PositionalsSchema>;

/**
 * Main bargs configuration.
 */
export interface BargsConfig<
  TOptions extends OptionsSchema = OptionsSchema,
  TPositionals extends PositionalsSchema = PositionalsSchema,
  TCommands extends Record<string, AnyCommandConfig> | undefined = undefined,
> {
  name: string;
  version?: string;
  description?: string;
  options?: TOptions;
  positionals?: TPositionals;
  commands?: TCommands;
  handler?: Handler<
    BargsResult<InferOptions<TOptions>, InferPositionals<TPositionals>, undefined>
  >;
  args?: string[];
}

/**
 * Bargs config with commands (requires commands, allows defaultHandler).
 */
export type BargsConfigWithCommands<
  TOptions extends OptionsSchema = OptionsSchema,
  TPositionals extends PositionalsSchema = PositionalsSchema,
  TCommands extends Record<string, AnyCommandConfig> = Record<string, AnyCommandConfig>,
> = Omit<BargsConfig<TOptions, TPositionals, TCommands>, 'handler'> & {
  commands: TCommands;
  defaultHandler?:
    | Handler<BargsResult<InferOptions<TOptions>, [], undefined>>
    | keyof TCommands;
};
