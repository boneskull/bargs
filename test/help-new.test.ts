// test/help-new.test.ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { generateCommandHelp, generateHelp } from '../src/help-new.js';
import { opt } from '../src/opt.js';
import { stripAnsi } from '../src/ansi.js';

describe('generateHelp', () => {
  it('generates help with name and description', () => {
    const help = stripAnsi(
      generateHelp({
        name: 'my-cli',
        description: 'A test CLI',
      }),
    );

    assert.ok(help.includes('my-cli'));
    assert.ok(help.includes('A test CLI'));
  });

  it('includes version when provided', () => {
    const help = stripAnsi(
      generateHelp({
        name: 'my-cli',
        version: '1.0.0',
      }),
    );

    assert.ok(help.includes('1.0.0'));
  });

  it('lists options with descriptions', () => {
    const help = stripAnsi(
      generateHelp({
        name: 'my-cli',
        options: {
          verbose: opt.boolean({ description: 'Enable verbose output', aliases: ['v'] }),
        },
      }),
    );

    assert.ok(help.includes('--verbose'));
    assert.ok(help.includes('-v'));
    assert.ok(help.includes('Enable verbose output'));
    assert.ok(help.includes('[boolean]'));
  });

  it('shows enum choices', () => {
    const help = stripAnsi(
      generateHelp({
        name: 'my-cli',
        options: {
          level: opt.enum(['low', 'medium', 'high'] as const, {
            description: 'Set level',
          }),
        },
      }),
    );

    assert.ok(help.includes('low | medium | high'));
  });

  it('shows default values', () => {
    const help = stripAnsi(
      generateHelp({
        name: 'my-cli',
        options: {
          name: opt.string({ default: 'world', description: 'Name to greet' }),
        },
      }),
    );

    assert.ok(help.includes('default: "world"'));
  });

  it('hides options marked as hidden', () => {
    const help = stripAnsi(
      generateHelp({
        name: 'my-cli',
        options: {
          visible: opt.boolean({ description: 'Visible option' }),
          secret: opt.boolean({ description: 'Secret option', hidden: true }),
        },
      }),
    );

    assert.ok(help.includes('--visible'));
    assert.ok(!help.includes('--secret'));
  });

  it('shows commands when present', () => {
    const help = stripAnsi(
      generateHelp({
        name: 'my-cli',
        commands: {
          run: opt.command({
            description: 'Run the thing',
            handler: () => {},
          }),
          build: opt.command({
            description: 'Build the thing',
            handler: () => {},
          }),
        },
      }),
    );

    assert.ok(help.includes('COMMANDS'));
    assert.ok(help.includes('run'));
    assert.ok(help.includes('Run the thing'));
    assert.ok(help.includes('build'));
    assert.ok(help.includes('Build the thing'));
  });

  it('groups options by group name', () => {
    const help = stripAnsi(
      generateHelp({
        name: 'my-cli',
        options: {
          verbose: opt.boolean({ description: 'Verbose', group: 'Logging' }),
          quiet: opt.boolean({ description: 'Quiet', group: 'Logging' }),
          port: opt.number({ description: 'Port', group: 'Network' }),
        },
      }),
    );

    assert.ok(help.includes('LOGGING'));
    assert.ok(help.includes('NETWORK'));
  });
});

describe('generateCommandHelp', () => {
  it('generates help for a specific command', () => {
    const help = stripAnsi(
      generateCommandHelp(
        {
          name: 'my-cli',
          options: {
            verbose: opt.boolean({ description: 'Global verbose' }),
          },
          commands: {
            greet: opt.command({
              description: 'Greet someone',
              options: {
                name: opt.string({ description: 'Name to greet' }),
              },
              handler: () => {},
            }),
          },
        },
        'greet',
      ),
    );

    assert.ok(help.includes('my-cli greet'));
    assert.ok(help.includes('Greet someone'));
    assert.ok(help.includes('--name'));
    assert.ok(help.includes('GLOBAL OPTIONS'));
    assert.ok(help.includes('--verbose'));
  });

  it('returns error for unknown command', () => {
    const help = generateCommandHelp(
      {
        name: 'my-cli',
        commands: {
          greet: opt.command({
            description: 'Greet someone',
            handler: () => {},
          }),
        },
      },
      'unknown',
    );

    assert.ok(help.includes('Unknown command: unknown'));
  });
});
