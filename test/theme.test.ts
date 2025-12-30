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

  it('getTheme merges partial theme with defaults', () => {
    // Partial theme with only some colors
    const partial: Theme = {
      colors: {
        scriptName: '\x1b[35m', // magenta
        sectionHeader: '\x1b[34m', // blue
      },
    };
    const resolved = getTheme(partial);

    // Provided values are used
    assert.strictEqual(resolved.colors.scriptName, '\x1b[35m');
    assert.strictEqual(resolved.colors.sectionHeader, '\x1b[34m');

    // Missing values fall back to defaults
    assert.strictEqual(resolved.colors.flag, defaultTheme.colors.flag);
    assert.strictEqual(resolved.colors.type, defaultTheme.colors.type);
    assert.strictEqual(
      resolved.colors.defaultText,
      defaultTheme.colors.defaultText,
    );
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
    assert.ok(result.includes('\x1b[95m')); // brightMagenta
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
