// src/types-new.ts

/**
 * Any command config (type-erased for collections). Uses a permissive handler
 * type to avoid variance issues.
 */
export interface AnyCommandConfig {
  description: string;

  handler: (result: any) => Promise<void> | void;
  options?: OptionsSchema;
  positionals?: PositionalsSchema;
}

/**
 * Array option definition (--flag value --flag value2).
 */
export interface ArrayOption extends OptionBase {
  default?: number[] | string[];
  /** Element type of the array */
  items: 'number' | 'string';
  type: 'array';
}

/**
 * Main bargs configuration.
 */
export interface BargsConfig<
  TOptions extends OptionsSchema = OptionsSchema,
  TPositionals extends PositionalsSchema = PositionalsSchema,
  TCommands extends Record<string, AnyCommandConfig> | undefined = undefined,
> {
  args?: string[];
  commands?: TCommands;
  description?: string;
  handler?: Handler<
    BargsResult<
      InferOptions<TOptions>,
      InferPositionals<TPositionals>,
      undefined
    >
  >;
  name: string;
  options?: TOptions;
  positionals?: TPositionals;
  version?: string;
}

/**
 * Bargs config with commands (requires commands, allows defaultHandler).
 */
export type BargsConfigWithCommands<
  TOptions extends OptionsSchema = OptionsSchema,
  TPositionals extends PositionalsSchema = PositionalsSchema,
  TCommands extends Record<string, AnyCommandConfig> = Record<
    string,
    AnyCommandConfig
  >,
> = Omit<BargsConfig<TOptions, TPositionals, TCommands>, 'handler'> & {
  commands: TCommands;
  defaultHandler?:
    | Handler<BargsResult<InferOptions<TOptions>, [], undefined>>
    | keyof TCommands;
};

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
 * Boolean option definition.
 */
export interface BooleanOption extends OptionBase {
  default?: boolean;
  type: 'boolean';
}

/**
 * Command configuration.
 */
export interface CommandConfig<
  TOptions extends OptionsSchema = OptionsSchema,
  TPositionals extends PositionalsSchema = PositionalsSchema,
> {
  description: string;
  handler: Handler<
    BargsResult<InferOptions<TOptions>, InferPositionals<TPositionals>, string>
  >;
  options?: TOptions;
  positionals?: TPositionals;
}

/**
 * Count option definition (--verbose --verbose = 2).
 */
export interface CountOption extends OptionBase {
  default?: number;
  type: 'count';
}

/**
 * Enum option definition with string choices.
 */
export interface EnumOption<T extends string = string> extends OptionBase {
  choices: readonly T[];
  default?: T;
  type: 'enum';
}

/**
 * Handler function signature.
 */
export type Handler<TResult> = (result: TResult) => Promise<void> | void;

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
export type InferPositional<T extends PositionalDef> =
  T extends NumberPositional
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
 * Number option definition.
 */
export interface NumberOption extends OptionBase {
  default?: number;
  type: 'number';
}

/**
 * Number positional.
 */
export interface NumberPositional extends PositionalBase {
  default?: number;
  type: 'number';
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
 * Union of positional definitions.
 */
export type PositionalDef =
  | NumberPositional
  | StringPositional
  | VariadicPositional;

/**
 * Positionals can be a tuple (ordered) or a single variadic.
 */
export type PositionalsSchema = PositionalDef[];

/**
 * String option definition.
 */
export interface StringOption extends OptionBase {
  default?: string;
  type: 'string';
}

/**
 * String positional.
 */
export interface StringPositional extends PositionalBase {
  default?: string;
  type: 'string';
}

/**
 * Variadic positional (rest args).
 */
export interface VariadicPositional extends PositionalBase {
  items: 'number' | 'string';
  type: 'variadic';
}

/**
 * Base properties shared by all option definitions.
 */
interface OptionBase {
  /** Aliases for this option (e.g., ['v'] for --verbose) */
  aliases?: string[];
  /** Option description displayed in help text */
  description?: string;
  /** Group name for help text organization */
  group?: string;
  /** Whether this option is hidden from help */
  hidden?: boolean;
  /** Whether this option is required */
  required?: boolean;
}

/**
 * Base properties for positional definitions.
 */
interface PositionalBase {
  description?: string;
  required?: boolean;
}
