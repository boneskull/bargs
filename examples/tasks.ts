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
 * This examples eschews the use of helper functions like `bargs.command()` and
 * `bargs.positionals()` in favor of raw object literals. Either way works if
 * you're defining the config inline!
 *
 * Usage: npx tsx examples/tasks.ts add "Buy groceries" --priority high npx tsx
 * examples/tasks.ts list npx tsx examples/tasks.ts done 1 npx tsx
 * examples/tasks.ts --help npx tsx examples/tasks.ts add --help
 */
import { bargsAsync } from '../src/index.js';

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
await bargsAsync({
  name: 'tasks',
  version: '1.0.0',
  description: 'A simple task manager',

  // Global options available to all commands
  options: {
    file: {
      description: 'Task storage file',
      default: 'tasks.json',
      aliases: ['f'],
      type: 'string',
    },
    verbose: {
      description: 'Show detailed output',
      default: false,
      aliases: ['v'],
      type: 'boolean',
    },
  },

  commands: {
    add: {
      description: 'Add a new task',
      options: {
        priority: {
          choices: ['low', 'medium', 'high'],
          type: 'enum',
          description: 'Task priority',
          default: 'medium',
          aliases: ['p'],
        },
      },
      // Raw array works with const type parameter inference
      positionals: [
        {
          description: 'Task description',
          name: 'text',
          required: true,
          type: 'string',
        },
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
          text: text,
        };
        tasks.push(task);

        if (verbose) {
          console.log('Added task:', task);
        } else {
          console.log(`Added task #${task.id}: ${text}`);
        }
      },
    },

    list: {
      description: 'List all tasks',
      options: {
        all: {
          description: 'Show completed tasks too',
          default: false,
          aliases: ['a'],
          type: 'boolean',
        },
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
    },

    done: {
      description: 'Mark a task as complete',
      // Raw array works with const type parameter inference
      positionals: [
        {
          type: 'string',
          description: 'Task ID',
          name: 'id',
          required: true,
        },
      ],
      handler: async ({ positionals, values }) => {
        const [idStr] = positionals;
        // idStr is now properly typed as string (required: true)
        const id = parseInt(idStr, 10);
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
    },
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
