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
 * - Themed help output (using 'ocean' theme)
 *
 * Usage: npx tsx examples/greeter.ts World npx tsx examples/greeter.ts World
 * --shout npx tsx examples/greeter.ts World -g "Hey there" npx tsx
 * examples/greeter.ts --help
 */
import { bargs, bargsAsync } from '../src/index.js';

const optionsDef = bargs.options({
  greeting: bargs.string({
    aliases: ['g'],
    default: 'Hello',
    description: 'The greeting to use',
  }),
  shout: bargs.boolean({
    aliases: ['s'],
    default: false,
    description: 'SHOUT THE GREETING',
  }),
  verbose: bargs.boolean({
    aliases: ['v'],
    default: false,
    description: 'Show extra output',
  }),
});

const positionalsDef = bargs.positionals(
  bargs.stringPos({
    description: 'Name to greet',
    name: 'name',
    required: true,
  }),
);

const main = async () => {
  // Pass theme option to customize help output colors
  // Available themes: 'default', 'mono', 'ocean', 'warm'
  // You can also pass a custom Theme object
  const result = await bargsAsync(
    {
      description: 'A friendly greeter CLI',
      name: 'greeter',
      options: optionsDef,
      positionals: positionalsDef,
      version: '1.0.0',
    },
    { theme: 'ocean' },
  );

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
