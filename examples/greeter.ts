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
 * - Zod transforms
 *
 * Usage: npx tsx examples/greeter.ts World npx tsx examples/greeter.ts World
 * --shout npx tsx examples/greeter.ts World -g "Hey there" npx tsx
 * examples/greeter.ts --help
 */
import { z } from 'zod';

import { bargs } from '../src/index.js';

const result = await bargs({
  aliases: {
    greeting: ['g'],
    shout: ['s'],
    verbose: ['v'],
  },
  description: 'A friendly greeter CLI',
  name: 'greeter',
  options: z.object({
    greeting: z.string().default('Hello').describe('The greeting to use'),
    shout: z.boolean().default(false).describe('SHOUT THE GREETING'),
    verbose: z.boolean().default(false).describe('Show extra output'),
  }),
  positionals: z.tuple([z.string().describe('Name to greet')]),
  version: '1.0.0',
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
