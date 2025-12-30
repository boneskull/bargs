// test/ansi.test.ts
import { expect } from 'bupkis';
import { describe, it } from 'node:test';

import { stripAnsi } from '../src/theme.js';

// ANSI codes for test construction
const RED = '\x1b[31m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

describe('stripAnsi', () => {
  it('removes ANSI codes from string', () => {
    const colored = `${RED}red${RESET}`;
    expect(stripAnsi(colored), 'to be', 'red');
  });

  it('passes through plain text', () => {
    expect(stripAnsi('hello'), 'to be', 'hello');
  });

  it('removes multiple ANSI codes', () => {
    const multiStyled = `${BOLD}${RED}bold red${RESET}`;
    expect(stripAnsi(multiStyled), 'to be', 'bold red');
  });

  it('handles empty string', () => {
    expect(stripAnsi(''), 'to be', '');
  });
});
