#!/usr/bin/env npx tsx
/**
 * Simple CLI example (no commands)
 *
 * A greeter that demonstrates:
 *
 * - Boolean flags (--shout, --verbose)
 * - String options with defaults (--greeting)
 * - Positional arguments (name)
 * - Aliases (-s, -v, -g)
 *
 * Usage: npx tsx examples/greeter.ts World npx tsx examples/greeter.ts World
 * --shout npx tsx examples/greeter.ts World -g "Hey there" npx tsx
 * examples/greeter.ts --help
 */
import { bargs } from '../src/index.js';

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
});

const positionalsDef = bargs.positionals(
  bargs.stringPos({ description: 'Name to greet', required: true }),
);

const main = async () => {
  const result = await bargs({
    name: 'greeter',
    version: '1.0.0',
    description: 'A friendly greeter CLI',
    options: optionsDef,
    positionals: positionalsDef,
  });

  // Destructure the result
  const { positionals, values } = result;
  const [name] = positionals;
  const { greeting, shout, verbose } = values;

  // Build the message
  let message = `${greeting}, ${name}!`;

  if (shout) {
    message = message.toUpperCase();
  }

  // Output
  if (verbose) {
    console.log('Configuration:', { greeting, name, shout });
  }

  console.log(message);
};

void main();
