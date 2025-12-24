import { describe, it } from 'node:test';
import { expect } from 'bupkis';
import { ansi, bold, dim, red, green, yellow, cyan, stripAnsi } from '../src/ansi.js';

describe('ansi', () => {
  it('should wrap text in bold', () => {
    const result = bold('hello');
    expect(result, 'to equal', '\x1b[1mhello\x1b[22m');
  });

  it('should wrap text in dim', () => {
    const result = dim('hello');
    expect(result, 'to equal', '\x1b[2mhello\x1b[22m');
  });

  it('should wrap text in red', () => {
    const result = red('error');
    expect(result, 'to equal', '\x1b[31merror\x1b[39m');
  });

  it('should wrap text in green', () => {
    const result = green('success');
    expect(result, 'to equal', '\x1b[32msuccess\x1b[39m');
  });

  it('should wrap text in yellow', () => {
    const result = yellow('warning');
    expect(result, 'to equal', '\x1b[33mwarning\x1b[39m');
  });

  it('should wrap text in cyan', () => {
    const result = cyan('info');
    expect(result, 'to equal', '\x1b[36minfo\x1b[39m');
  });

  it('should strip ANSI codes', () => {
    const result = stripAnsi(bold(red('hello')));
    expect(result, 'to equal', 'hello');
  });

  it('should allow composing styles', () => {
    const result = bold(red('error'));
    expect(result, 'to contain', '\x1b[1m');
    expect(result, 'to contain', '\x1b[31m');
    expect(stripAnsi(result), 'to equal', 'error');
  });
});
