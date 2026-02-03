/**
 * Tests for public exports.
 */
import { expect } from 'bupkis';
import { describe, it } from 'node:test';

import type { CreateOptions, Theme, ThemeColors } from '../src/index.js';

import { createStyler, defaultTheme, themes } from '../src/index.js';

// TODO: Add tests for each exported function and type.
// TODO: rename as "contract.test.js" or something

describe('public exports', () => {
  it('exports theme utilities', () => {
    expect(themes, 'to be defined');
    expect(createStyler, 'to be defined');
    expect(defaultTheme, 'to be defined');
  });

  it('exports theme types (compiles = passes)', () => {
    const theme: Theme = themes.default;
    const colors: ThemeColors = themes.default.colors;
    expect(theme, 'to be defined');
    expect(colors, 'to be defined');
  });

  it('exports CreateOptions type (compiles = passes)', () => {
    const opts: CreateOptions = { theme: 'mono', version: '1.0.0' };
    expect(opts, 'to be defined');
  });
});
