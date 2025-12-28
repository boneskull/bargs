#!/usr/bin/env npx tsx
/**
 * Command-based CLI example
 *
 * A task manager that demonstrates:
 *
 * - Multiple commands (add, list, done)
 * - Global options (--verbose, --file)
 * - Command-specific options (--priority for add)
 * - Command positionals (task text)
 * - DefineCommand() for type inference
 * - DefaultHandler for no-command case
 *
 * Usage: npx tsx examples/tasks.ts add "Buy groceries" --priority high npx tsx
 * examples/tasks.ts list npx tsx examples/tasks.ts done 1 npx tsx
 * examples/tasks.ts --help npx tsx examples/tasks.ts add --help
 */
import { z } from 'zod';

import { bargs, defineCommand } from '../src/index.js';

// In-memory task storage (in a real app, this would be a file or database)
interface Task {
  id: number;
  text: string;
  priority: 'low' | 'medium' | 'high';
  done: boolean;
}

const tasks: Task[] = [
  { done: false, id: 1, priority: 'medium', text: 'Example task' },
];

let nextId = 2;

// Run the CLI
await bargs({
  aliases: {
    file: ['f'],
    verbose: ['v'],
  },
  commands: {
    add: defineCommand({
      aliases: {
        priority: ['p'],
      },
      description: 'Add a new task',
      handler: async ({ positionals, values }) => {
        const [text] = positionals;
        const { priority, verbose } = values;

        const task: Task = {
          done: false,
          id: nextId++,
          priority,
          text,
        };
        tasks.push(task);

        if (verbose) {
          console.log('Added task:', task);
        } else {
          console.log(`Added task #${task.id}: ${text}`);
        }
      },
      options: z.object({
        priority: z
          .enum(['low', 'medium', 'high'])
          .default('medium')
          .describe('Task priority'),
      }),
      positionals: z.tuple([z.string().describe('Task description')]),
    }),

    done: defineCommand({
      description: 'Mark a task as complete',
      handler: async ({ positionals, values }) => {
        const [idStr] = positionals;
        const id = parseInt(idStr, 10);
        const { verbose } = values;

        const task = tasks.find((t) => t.id === id);
        if (!task) {
          console.error(`Task #${id} not found`);
          process.exit(1);
        }

        task.done = true;

        if (verbose) {
          console.log('Completed task:', task);
        } else {
          console.log(`Completed task #${id}: ${task.text}`);
        }
      },
      positionals: z.tuple([z.string().describe('Task ID')]),
    }),

    list: defineCommand({
      aliases: {
        all: ['a'],
      },
      description: 'List all tasks',
      handler: async ({ values }) => {
        const { all, verbose } = values;

        const filtered = all ? tasks : tasks.filter((t) => !t.done);

        if (filtered.length === 0) {
          console.log('No tasks found');
          return;
        }

        if (verbose) {
          console.log('Tasks:', JSON.stringify(filtered, null, 2));
        } else {
          for (const task of filtered) {
            const status = task.done ? '[x]' : '[ ]';
            const priority =
              task.priority === 'high'
                ? '!!!'
                : task.priority === 'low'
                  ? '.'
                  : '';
            console.log(`${status} #${task.id} ${task.text} ${priority}`);
          }
        }
      },
      options: z.object({
        all: z.boolean().default(false).describe('Show completed tasks too'),
      }),
    }),
  },

  // Default handler when no command is given - show task count
  defaultHandler: async ({ values }) => {
    const pending = tasks.filter((t) => !t.done).length;
    if (values.verbose) {
      console.log(`Tasks: ${tasks.length} total, ${pending} pending`);
    } else {
      console.log(`${pending} pending task(s)`);
    }
  },

  description: 'A simple task manager',

  name: 'tasks',

  // Global options available to all commands
  options: z.object({
    file: z.string().default('tasks.json').describe('Task storage file'),
    verbose: z.boolean().default(false).describe('Show detailed output'),
  }),

  version: '1.0.0',
});
