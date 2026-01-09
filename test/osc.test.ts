import { expect } from 'bupkis';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { link, linkifyUrls, supportsHyperlinks } from '../src/osc.js';

describe('osc', () => {
  const envKeys = [
    'CI',
    'CURSOR_TRACE_ID',
    'FORCE_HYPERLINK',
    'NETLIFY',
    'TEAMCITY_VERSION',
    'TERM',
    'TERM_PROGRAM',
    'VTE_VERSION',
    'WT_SESSION',
  ] as const;

  let savedEnv: Record<string, string | undefined>;

  beforeEach(() => {
    savedEnv = Object.fromEntries(
      envKeys.map((key) => [key, process.env[key]]),
    );
  });

  afterEach(() => {
    for (const key of envKeys) {
      if (savedEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = savedEnv[key];
      }
    }
  });

  describe('link()', () => {
    it('should create an OSC 8 hyperlink', () => {
      const result = link('click me', 'https://example.com');
      // Should contain the URL in the opening sequence
      expect(result, 'to contain', 'https://example.com');
      // Should contain the visible text
      expect(result, 'to contain', 'click me');
      // Should have OSC 8 markers (escape + ])
      expect(result, 'to contain', '\x1b]8');
    });

    it('should wrap URL with proper OSC sequences', () => {
      const result = link('test', 'https://test.com');
      // Format: OSC 8 ; ; URL BEL text OSC 8 ; ; BEL
      expect(
        result,
        'to match',
        // eslint-disable-next-line no-control-regex
        /\x1b\]8;;https:\/\/test\.com\x07test\x1b\]8;;\x07/,
      );
    });
  });

  describe('supportsHyperlinks()', () => {
    it('should return a boolean', () => {
      const result = supportsHyperlinks();
      expect(typeof result, 'to be', 'boolean');
    });

    it('should return false for non-TTY streams', () => {
      // Create a mock stream that is not a TTY
      const mockStream = { isTTY: false } as NodeJS.WriteStream;
      const result = supportsHyperlinks(mockStream);
      expect(result, 'to be', false);
    });

    it('should respect FORCE_HYPERLINK=1', () => {
      process.env.FORCE_HYPERLINK = '1';
      expect(supportsHyperlinks(), 'to be', true);
    });

    it('should respect FORCE_HYPERLINK=0', () => {
      process.env.FORCE_HYPERLINK = '0';
      expect(supportsHyperlinks(), 'to be', false);
    });

    it(
      'should return false for VTE 0.50.0 (dotted format) due to segfault bug',
      { skip: process.platform === 'win32' },
      () => {
        delete process.env.CI;
        delete process.env.FORCE_HYPERLINK;
        delete process.env.TERM_PROGRAM;
        process.env.VTE_VERSION = '0.50.0';

        const mockStream = { isTTY: true } as NodeJS.WriteStream;
        expect(supportsHyperlinks(mockStream), 'to be', false);
      },
    );

    it(
      'should return false for VTE 0.50.0 (compact format "5000") due to segfault bug',
      { skip: process.platform === 'win32' },
      () => {
        delete process.env.CI;
        delete process.env.FORCE_HYPERLINK;
        delete process.env.TERM_PROGRAM;
        process.env.VTE_VERSION = '5000';

        const mockStream = { isTTY: true } as NodeJS.WriteStream;
        expect(supportsHyperlinks(mockStream), 'to be', false);
      },
    );

    it(
      'should return true for VTE 0.50.1 (compact format "5001")',
      { skip: process.platform === 'win32' },
      () => {
        delete process.env.CI;
        delete process.env.FORCE_HYPERLINK;
        delete process.env.TERM_PROGRAM;
        process.env.VTE_VERSION = '5001';

        const mockStream = { isTTY: true } as NodeJS.WriteStream;
        expect(supportsHyperlinks(mockStream), 'to be', true);
      },
    );
  });

  describe('linkifyUrls()', () => {
    it('should return text unchanged when hyperlinks not supported', () => {
      const mockStream = { isTTY: false } as NodeJS.WriteStream;
      const text = 'Visit https://example.com for more info';
      expect(linkifyUrls(text, mockStream), 'to be', text);
    });

    it('should linkify URLs when hyperlinks are supported', () => {
      process.env.FORCE_HYPERLINK = '1';
      const text = 'Visit https://example.com for more info';
      const result = linkifyUrls(text);

      // Should contain OSC 8 sequences
      expect(result, 'to contain', '\x1b]8');
      // Should still contain the URL
      expect(result, 'to contain', 'https://example.com');
    });

    it('should linkify multiple URLs', () => {
      process.env.FORCE_HYPERLINK = '1';
      const text = 'See https://foo.com and https://bar.com';
      const result = linkifyUrls(text);

      // Count OSC 8 opening sequences (should be 2)
      // eslint-disable-next-line no-control-regex
      const matches = result.match(/\x1b\]8;;https:\/\//g);
      expect(matches?.length, 'to be', 2);
    });

    it('should handle http URLs', () => {
      process.env.FORCE_HYPERLINK = '1';
      const text = 'Visit http://example.com for more';
      expect(linkifyUrls(text), 'to contain', '\x1b]8;;http://example.com');
    });

    it('should not linkify non-URL text', () => {
      process.env.FORCE_HYPERLINK = '1';
      const text = 'No URLs here, just plain text';
      expect(linkifyUrls(text), 'to be', text);
    });
  });
});
