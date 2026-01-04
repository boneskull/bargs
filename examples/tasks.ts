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
 * - Using bargs.command<TGlobalOptions>() for type inference
 * - DefaultHandler for no-command case
 *
 * Usage: npx tsx examples/tasks.ts add "Buy groceries" --priority high npx tsx
 * examples/tasks.ts list npx tsx examples/tasks.ts done 1 npx tsx
 * examples/tasks.ts --help npx tsx examples/tasks.ts add --help
 */
import { bargsAsync } from '../src/index.js';

// In-memory task storage (in a real app, this would be a file or database)
interface Task {
  done: boolean;
  id: number;
  priority: 'high' | 'low' | 'medium';
  text: string;
}

const tasks: Task[] = [
  { done: false, id: 1, priority: 'medium', text: 'Example task' },
];

let nextId = 2;

// Define global options first - this enables type inference in command handlers
const globalOptions = {
  file: bargsAsync.string({
    aliases: ['f'],
    default: 'tasks.json',
    description: 'Task storage file',
  }),
  verbose: bargsAsync.boolean({
    aliases: ['v'],
    default: false,
    description: 'Show detailed output',
  }),
} as const;

// Define commands using bargsAsync.command<typeof globalOptions>()
// This enables proper type inference for both global and local options
const addCommand = bargsAsync.command<typeof globalOptions>()({
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
  options: {
    priority: bargsAsync.enum(['low', 'medium', 'high'] as const, {
      aliases: ['p'],
      default: 'medium',
      description: 'Task priority',
    }),
  },
  positionals: [
    bargsAsync.stringPos({
      description: 'Task description',
      name: 'text',
      required: true,
    }),
  ],
});

const doneCommand = bargsAsync.command<typeof globalOptions>()({
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
  positionals: [
    bargsAsync.stringPos({
      description: 'Task ID',
      name: 'id',
      required: true,
    }),
  ],
});

const listCommand = bargsAsync.command<typeof globalOptions>()({
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
          task.priority === 'high' ? '!!!' : task.priority === 'low' ? '.' : '';
        console.log(`${status} #${task.id} ${task.text} ${priority}`);
      }
    }
  },
  options: {
    all: bargsAsync.boolean({
      aliases: ['a'],
      default: false,
      description: 'Show completed tasks too',
    }),
  },
});

// Run the CLI
await bargsAsync({
  commands: {
    add: addCommand,
    done: doneCommand,
    list: listCommand,
  },
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
  options: globalOptions,
  version: '1.0.0',
});
