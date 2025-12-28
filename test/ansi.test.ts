import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { bold, cyan, dim, green, red, stripAnsi, yellow } from '../src/ansi.js';

describe('ansi', () => {
  it('should wrap text in bold', () => {
    const result = bold('hello');
    assert.equal(result, '\x1b[1mhello\x1b[22m');
  });

  it('should wrap text in dim', () => {
    const result = dim('hello');
    assert.equal(result, '\x1b[2mhello\x1b[22m');
  });

  it('should wrap text in red', () => {
    const result = red('error');
    assert.equal(result, '\x1b[31merror\x1b[39m');
  });

  it('should wrap text in green', () => {
    const result = green('success');
    assert.equal(result, '\x1b[32msuccess\x1b[39m');
  });

  it('should wrap text in yellow', () => {
    const result = yellow('warning');
    assert.equal(result, '\x1b[33mwarning\x1b[39m');
  });

  it('should wrap text in cyan', () => {
    const result = cyan('info');
    assert.equal(result, '\x1b[36minfo\x1b[39m');
  });

  it('should strip ANSI codes', () => {
    const result = stripAnsi(bold(red('hello')));
    assert.equal(result, 'hello');
  });

  it('should allow composing styles', () => {
    const result = bold(red('error'));
    assert.ok(result.includes('\x1b[1m'));
    assert.ok(result.includes('\x1b[31m'));
    assert.equal(stripAnsi(result), 'error');
  });
});
