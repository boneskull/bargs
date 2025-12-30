// test/exports.test.ts
import { expect } from 'bupkis';
import { describe, it } from 'node:test';

import type { BargsOptions, Theme, ThemeColors } from '../src/index.js';

import { createStyler, defaultTheme, themes } from '../src/index.js';

describe('public exports', () => {
  it('exports theme utilities', () => {
    expect(themes, 'to be defined');
    expect(createStyler, 'to be defined');
    expect(defaultTheme, 'to be defined');
  });

  it('exports theme types (compiles = passes)', () => {
    // Type-only test - if this compiles, types are exported
    const _theme: Theme = themes.default;
    const _colors: ThemeColors = themes.default.colors;
    expect(_theme, 'to be defined');
    expect(_colors, 'to be defined');
  });

  it('exports BargsOptions type (compiles = passes)', () => {
    // Type-only test - if this compiles, BargsOptions is exported
    const _opts: BargsOptions = { theme: 'mono' };
    expect(_opts, 'to be defined');
  });
});
