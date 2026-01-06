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
 * - Full type inference with the (Parser, handler) API
 *
 * Usage: npx tsx examples/tasks.ts add "Buy groceries" --priority high npx tsx
 * examples/tasks.ts list npx tsx examples/tasks.ts done 1 npx tsx
 * examples/tasks.ts --help npx tsx examples/tasks.ts add --help
 */
import { bargs, opt, pos } from '../src/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// DATA STORE
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// GLOBAL OPTIONS
// ═══════════════════════════════════════════════════════════════════════════════

const globalOptions = opt.options({
  file: opt.string({ default: 'tasks.json' }),
  verbose: opt.boolean({ default: false }),
});

// ═══════════════════════════════════════════════════════════════════════════════
// COMMAND PARSERS
// Using direct function calls to merge parsers (better type inference than pipe)
// ═══════════════════════════════════════════════════════════════════════════════

// Add command parser: priority option + text positional
// First create options, then merge with positionals
const addOptions = opt.options({
  priority: opt.enum(['low', 'medium', 'high'], { default: 'medium' }),
});
const addPositionals = pos.positionals(
  pos.string({ name: 'text', required: true }),
);
// Merge: positionals(options) gives us Parser<{ priority: ... }, [string]>
const addParser = addPositionals(addOptions);

// List command parser: just the --all flag
const listParser = opt.options({
  all: opt.boolean({ default: false }),
});

// Done command parser: just the id positional
const doneParser = pos.positionals(pos.string({ name: 'id', required: true }));

// ═══════════════════════════════════════════════════════════════════════════════
// CLI
// Using (Parser, handler, description) form for full type inference!
// ═══════════════════════════════════════════════════════════════════════════════

await bargs
  .create('tasks', {
    description: 'A simple task manager',
    version: '1.0.0',
  })
  .globals(globalOptions)
  // The handler receives merged global + command types
  .command(
    'add',
    addParser,
    ({ positionals, values }) => {
      const [text] = positionals;
      // values has full type: { file, verbose, priority }
      const task: Task = {
        done: false,
        id: nextId++,
        priority: values.priority,
        text,
      };
      tasks.push(task);

      if (values.verbose) {
        console.log('Added task:', task);
        console.log('Using file:', values.file);
      } else {
        console.log(`Added task #${task.id}: ${text}`);
      }
    },
    'Add a new task',
  )
  .command(
    'list',
    listParser,
    ({ values }) => {
      // values has full type: { file, verbose, all }
      const filtered = values.all ? tasks : tasks.filter((t) => !t.done);

      if (values.verbose) {
        console.log('Loading from:', values.file);
      }

      if (filtered.length === 0) {
        console.log('No tasks found');
        return;
      }

      if (values.verbose) {
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
    'List all tasks',
  )
  .command(
    'done',
    doneParser,
    ({ positionals, values }) => {
      const [idStr] = positionals;
      const id = parseInt(idStr, 10);
      // values has full type: { file, verbose }

      const task = tasks.find((t) => t.id === id);
      if (!task) {
        console.error(`Task #${id} not found`);
        process.exit(1);
      }

      task.done = true;

      if (values.verbose) {
        console.log('Completed task:', task);
        console.log('Will save to:', values.file);
      } else {
        console.log(`Completed task #${id}: ${task.text}`);
      }
    },
    'Mark a task as complete',
  )
  .defaultCommand('list')
  .parseAsync();
