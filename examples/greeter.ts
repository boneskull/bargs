#!/usr/bin/env npx tsx
/**
 * Simple CLI example
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
import { bargs, opt, pos } from '../src/index.js';

// Define global options
const globalOptions = opt.options({
  greeting: opt.string({
    aliases: ['g'],
    default: 'Hello',
    description: 'The greeting to use',
  }),
  shout: opt.boolean({
    aliases: ['s'],
    default: false,
    description: 'SHOUT THE GREETING',
  }),
  verbose: opt.boolean({
    aliases: ['v'],
    default: false,
    description: 'Show extra output',
  }),
});

// Define the positionals for the greet command
const greetPositionals = pos.positionals(
  pos.string({
    description: 'Name to greet',
    name: 'name',
    required: true,
  }),
);

// Build and run the CLI
// Using the (Parser, handler) form for full type inference of merged globals
await bargs('greeter', {
  description: 'A friendly greeter CLI',
  version: '1.0.0',
})
  .globals(globalOptions)
  // The (Parser, handler, description) form gives us merged global + command types!
  .command(
    'greet',
    greetPositionals,
    ({ positionals, values }) => {
      const [name] = positionals;
      // values has full type: { greeting: string, shout: boolean, verbose: boolean }
      // NO type assertions needed!

      let message = `${values.greeting}, ${name}!`;
      if (values.shout) {
        message = message.toUpperCase();
      }

      if (values.verbose) {
        console.log('Configuration:', {
          greeting: values.greeting,
          name,
          shout: values.shout,
        });
      }

      console.log(message);
    },
    'Greet someone by name',
  )
  // Make 'greet' the default so users don't need to type it
  .defaultCommand('greet')
  .parseAsync();
