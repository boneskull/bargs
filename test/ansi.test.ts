// test/ansi.test.ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { stripAnsi } from '../src/theme.js';

// ANSI codes for test construction
const RED = '\x1b[31m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

describe('stripAnsi', () => {
  it('removes ANSI codes from string', () => {
    const colored = `${RED}red${RESET}`;
    assert.strictEqual(stripAnsi(colored), 'red');
  });

  it('passes through plain text', () => {
    assert.strictEqual(stripAnsi('hello'), 'hello');
  });

  it('removes multiple ANSI codes', () => {
    const multiStyled = `${BOLD}${RED}bold red${RESET}`;
    assert.strictEqual(stripAnsi(multiStyled), 'bold red');
  });

  it('handles empty string', () => {
    assert.strictEqual(stripAnsi(''), '');
  });
});
