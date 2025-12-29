// test/exports.test.ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { BargsOptions, Theme, ThemeColors } from '../src/index.js';

import { createStyler, defaultTheme, getTheme, themes } from '../src/index.js';

describe('public exports', () => {
  it('exports theme utilities', () => {
    assert.ok(themes !== undefined);
    assert.ok(getTheme !== undefined);
    assert.ok(createStyler !== undefined);
    assert.ok(defaultTheme !== undefined);
  });

  it('exports theme types (compiles = passes)', () => {
    // Type-only test - if this compiles, types are exported
    const _theme: Theme = themes.default;
    const _colors: ThemeColors = themes.default.colors;
    assert.ok(_theme !== undefined);
    assert.ok(_colors !== undefined);
  });

  it('exports BargsOptions type (compiles = passes)', () => {
    // Type-only test - if this compiles, BargsOptions is exported
    const _opts: BargsOptions = { theme: 'mono' };
    assert.ok(_opts !== undefined);
  });
});
