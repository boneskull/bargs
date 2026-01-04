# Command Handler Type Inference

## Problem

When defining commands inline without `bargs.command()`, handler parameters (`values`, `positionals`) become `any`:

```typescript
bargsAsync({
  commands: {
    create: {
      options: { verbose: bargs.boolean() },
      handler: ({ values }) => {
        // values is 'any' - no type inference!
      },
    },
  },
});
```

**Root cause:** `CommandConfigInput` uses `handler: Handler<any>`, losing type information when TypeScript infers `TCommands extends Record<string, CommandConfigInput>`.

## Solution

Use a mapped type that captures each command's structure and computes the correct handler type, including:

- Global options merged with command options
- Global transforms applied first, then command transforms
- Command positionals through command transforms

### New Type: `InferredCommands`

```typescript
type InferredCommands<
  TGlobalOptions extends OptionsSchema,
  TGlobalTransforms extends TransformsConfig<any, any, any, any> | undefined,
  TCommands extends Record<string, CommandConfigInput>,
> = {
  [K in keyof TCommands]: {
    description: string;
    options?: TCommands[K]['options'];
    positionals?: TCommands[K]['positionals'];
    transforms?: TCommands[K]['transforms'];
    handler: Handler<
      BargsResult<
        InferTransformedValues<
          InferTransformedValues<
            InferOptions<TGlobalOptions> &
              InferOptions<
                TCommands[K]['options'] extends OptionsSchema
                  ? TCommands[K]['options']
                  : Record<string, never>
              >,
            TGlobalTransforms
          >,
          TCommands[K]['transforms']
        >,
        InferTransformedPositionals<
          InferPositionals<
            TCommands[K]['positionals'] extends PositionalsSchema
              ? TCommands[K]['positionals']
              : readonly []
          >,
          TCommands[K]['transforms']
        >,
        string
      >
    >;
  };
};
```

### Updated `BargsConfigWithCommands`

Use intersection to overlay computed handler types:

```typescript
type BargsConfigWithCommands<
  TOptions extends OptionsSchema,
  TCommands extends Record<string, CommandConfigInput>,
  TTransforms extends TransformsConfig<...> | undefined,
> = {
  // ... other properties
  commands: TCommands & InferredCommands<TOptions, TTransforms, TCommands>;
};
```

## Behavior

Command handlers receive:

- **values**: `InferOptions<GlobalOpts> & InferOptions<CommandOpts>`, transformed by global then command transforms
- **positionals**: `InferPositionals<CommandPositionals>`, transformed by command transforms
- **command**: `string` (the command name)

## Files to Modify

1. `src/types.ts` - Add `InferredCommands`, update `BargsConfigWithCommands`
2. `src/bargs.ts` - Update function overloads to use new types
