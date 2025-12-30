// test/theme.test.ts
import { expect } from 'bupkis';
import { describe, it } from 'node:test';

import type { Theme } from '../src/theme.js';

import { createStyler, defaultTheme, getTheme, themes } from '../src/theme.js';

describe('Theme', () => {
  it('should export themes object with default and mono themes', () => {
    expect('default' in themes, 'to be truthy');
    expect('mono' in themes, 'to be truthy');
  });

  it('should have defaultTheme matching themes.default', () => {
    expect(defaultTheme, 'to be', themes.default);
  });

  it('getTheme returns theme by name', () => {
    expect(getTheme('default'), 'to be', themes.default);
    expect(getTheme('mono'), 'to be', themes.mono);
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
    expect(resolved.colors.scriptName, 'to be', '\x1b[35m');
    expect(resolved.colors.sectionHeader, 'to be', '\x1b[34m');

    // Missing values fall back to defaults
    expect(resolved.colors.flag, 'to be', defaultTheme.colors.flag);
    expect(resolved.colors.type, 'to be', defaultTheme.colors.type);
    expect(
      resolved.colors.defaultText,
      'to be',
      defaultTheme.colors.defaultText,
    );
  });

  it('mono theme has all colors as empty strings', () => {
    const mono = themes.mono;
    for (const value of Object.values(mono.colors)) {
      expect(value, 'to be', '');
    }
  });
});

describe('createStyler', () => {
  it('creates styler from default theme', () => {
    const styler = createStyler(themes.default);
    expect(typeof styler.scriptName, 'to be', 'function');
    expect(typeof styler.flag, 'to be', 'function');
  });

  it('applies color codes with default theme', () => {
    const styler = createStyler(themes.default);
    const result = styler.sectionHeader('OPTIONS');
    expect(result, 'to contain', '\x1b[95m'); // brightMagenta
    expect(result, 'to contain', 'OPTIONS');
    expect(result, 'to contain', '\x1b[0m'); // reset
  });

  it('passes through text with mono theme', () => {
    const styler = createStyler(themes.mono);
    const result = styler.sectionHeader('OPTIONS');
    expect(result, 'to be', 'OPTIONS');
  });

  it('applies bold styling for scriptName', () => {
    const styler = createStyler(themes.default);
    const result = styler.scriptName('myapp');
    expect(result, 'to contain', '\x1b[1m'); // bold
    expect(result, 'to contain', 'myapp');
  });

  it('has epilog and url style functions', () => {
    const styler = createStyler(themes.default);
    expect(typeof styler.epilog, 'to be', 'function');
    expect(typeof styler.url, 'to be', 'function');
  });

  it('applies epilog styling with default theme', () => {
    const styler = createStyler(themes.default);
    const result = styler.epilog('Homepage: https://example.com');
    // Default epilog color is dim
    expect(result, 'to contain', '\x1b[2m'); // dim
    expect(result, 'to contain', 'Homepage: https://example.com');
  });

  it('applies url styling with default theme', () => {
    const styler = createStyler(themes.default);
    const result = styler.url('https://example.com');
    // Default url color is cyan
    expect(result, 'to contain', '\x1b[36m'); // cyan
    expect(result, 'to contain', 'https://example.com');
  });
});

describe('Theme colors', () => {
  it('all themes have epilog and url colors', () => {
    for (const [name, theme] of Object.entries(themes)) {
      expect('epilog' in theme.colors, 'to be truthy');
      expect('url' in theme.colors, 'to be truthy');
    }
  });
});
