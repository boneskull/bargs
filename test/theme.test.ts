// test/theme.test.ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Theme } from '../src/theme.js';

import { createStyler, defaultTheme, getTheme, themes } from '../src/theme.js';

describe('Theme', () => {
  it('should export themes object with default and mono themes', () => {
    assert.ok('default' in themes);
    assert.ok('mono' in themes);
  });

  it('should have defaultTheme matching themes.default', () => {
    assert.strictEqual(defaultTheme, themes.default);
  });

  it('getTheme returns theme by name', () => {
    assert.strictEqual(getTheme('default'), themes.default);
    assert.strictEqual(getTheme('mono'), themes.mono);
  });

  it('getTheme returns custom theme object as-is', () => {
    const custom: Theme = {
      colors: {
        command: '\x1b[34m',
        defaultValue: '\x1b[2m',
        description: '',
        example: '\x1b[2m',
        flag: '\x1b[36m',
        positional: '\x1b[33m',
        scriptName: '\x1b[35m',
        sectionHeader: '\x1b[33m',
        type: '\x1b[36m',
        usage: '',
      },
    };
    assert.strictEqual(getTheme(custom), custom);
  });

  it('mono theme has all colors as empty strings', () => {
    const mono = themes.mono;
    for (const value of Object.values(mono.colors)) {
      assert.strictEqual(value, '');
    }
  });
});

describe('createStyler', () => {
  it('creates styler from default theme', () => {
    const styler = createStyler(themes.default);
    assert.strictEqual(typeof styler.scriptName, 'function');
    assert.strictEqual(typeof styler.flag, 'function');
  });

  it('applies color codes with default theme', () => {
    const styler = createStyler(themes.default);
    const result = styler.sectionHeader('OPTIONS');
    assert.ok(result.includes('\x1b[33m')); // yellow
    assert.ok(result.includes('OPTIONS'));
    assert.ok(result.includes('\x1b[0m')); // reset
  });

  it('passes through text with mono theme', () => {
    const styler = createStyler(themes.mono);
    const result = styler.sectionHeader('OPTIONS');
    assert.strictEqual(result, 'OPTIONS');
  });

  it('applies bold styling for scriptName', () => {
    const styler = createStyler(themes.default);
    const result = styler.scriptName('myapp');
    assert.ok(result.includes('\x1b[1m')); // bold
    assert.ok(result.includes('myapp'));
  });
});
