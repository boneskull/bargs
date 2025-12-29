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
 * - Bargs.command() for type inference
 * - DefaultHandler for no-command case
 *
 * Usage: npx tsx examples/tasks.ts add "Buy groceries" --priority high npx tsx
 * examples/tasks.ts list npx tsx examples/tasks.ts done 1 npx tsx
 * examples/tasks.ts --help npx tsx examples/tasks.ts add --help
 */
import bargs from '../src/index.js';

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
  name: 'tasks',
  version: '1.0.0',
  description: 'A simple task manager',

  // Global options available to all commands
  options: {
    file: bargs.string({
      description: 'Task storage file',
      default: 'tasks.json',
      aliases: ['f'],
    }),
    verbose: bargs.boolean({
      description: 'Show detailed output',
      default: false,
      aliases: ['v'],
    }),
  },

  commands: {
    add: bargs.command({
      description: 'Add a new task',
      options: {
        priority: bargs.enum(['low', 'medium', 'high'], {
          description: 'Task priority',
          default: 'medium',
          aliases: ['p'],
        }),
      },
      positionals: [
        bargs.stringPos({ description: 'Task description', required: true }),
      ],
      handler: async ({ positionals, values }) => {
        const [text] = positionals;
        // priority is typed from command options
        // verbose is accessible via Record<string, unknown>
        const { priority, verbose } = values;

        const task: Task = {
          done: false,
          id: nextId++,
          priority,
          text: text as string,
        };
        tasks.push(task);

        if (verbose) {
          console.log('Added task:', task);
        } else {
          console.log(`Added task #${task.id}: ${text}`);
        }
      },
    }),

    list: bargs.command({
      description: 'List all tasks',
      options: {
        all: bargs.boolean({
          description: 'Show completed tasks too',
          default: false,
          aliases: ['a'],
        }),
      },
      handler: async ({ values }) => {
        // all is typed from command options, verbose from global
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
    }),

    done: bargs.command({
      description: 'Mark a task as complete',
      positionals: [
        bargs.stringPos({ description: 'Task ID', required: true }),
      ],
      handler: async ({ positionals, values }) => {
        const [idStr] = positionals;
        const id = parseInt(idStr as string, 10);
        // verbose is accessible from global options
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
    }),
  },

  // Default handler when no command is given - show task count
  defaultHandler: async ({ values }) => {
    const pending = tasks.filter((t) => !t.done).length;
    // Global options are fully typed in defaultHandler
    if (values.verbose) {
      console.log(`Tasks: ${tasks.length} total, ${pending} pending`);
    } else {
      console.log(`${pending} pending task(s)`);
    }
  },
});
