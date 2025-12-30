import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { link, linkifyUrls, supportsHyperlinks } from '../src/osc.js';

describe('osc', () => {
  describe('link()', () => {
    it('should create an OSC 8 hyperlink', () => {
      const result = link('click me', 'https://example.com');
      // Should contain the URL in the opening sequence
      assert.ok(result.includes('https://example.com'));
      // Should contain the visible text
      assert.ok(result.includes('click me'));
      // Should have OSC 8 markers (escape + ])
      assert.ok(result.includes('\x1b]8'));
    });

    it('should wrap URL with proper OSC sequences', () => {
      const result = link('test', 'https://test.com');
      // Format: OSC 8 ; ; URL BEL text OSC 8 ; ; BEL
      // eslint-disable-next-line no-control-regex
      assert.match(result, /\x1b\]8;;https:\/\/test\.com\x07test\x1b\]8;;\x07/);
    });
  });

  describe('supportsHyperlinks()', () => {
    it('should return a boolean', () => {
      const result = supportsHyperlinks();
      assert.equal(typeof result, 'boolean');
    });

    it('should return false for non-TTY streams', () => {
      // Create a mock stream that is not a TTY
      const mockStream = { isTTY: false } as NodeJS.WriteStream;
      const result = supportsHyperlinks(mockStream);
      assert.equal(result, false);
    });

    it('should respect FORCE_HYPERLINK=1', () => {
      const originalEnv = process.env.FORCE_HYPERLINK;
      try {
        process.env.FORCE_HYPERLINK = '1';
        const result = supportsHyperlinks();
        assert.equal(result, true);
      } finally {
        if (originalEnv === undefined) {
          delete process.env.FORCE_HYPERLINK;
        } else {
          process.env.FORCE_HYPERLINK = originalEnv;
        }
      }
    });

    it('should respect FORCE_HYPERLINK=0', () => {
      const originalEnv = process.env.FORCE_HYPERLINK;
      try {
        process.env.FORCE_HYPERLINK = '0';
        const result = supportsHyperlinks();
        assert.equal(result, false);
      } finally {
        if (originalEnv === undefined) {
          delete process.env.FORCE_HYPERLINK;
        } else {
          process.env.FORCE_HYPERLINK = originalEnv;
        }
      }
    });

    it('should return false for VTE 0.50.0 (dotted format) due to segfault bug', () => {
      const originalForce = process.env.FORCE_HYPERLINK;
      const originalVte = process.env.VTE_VERSION;
      try {
        delete process.env.FORCE_HYPERLINK;
        process.env.VTE_VERSION = '0.50.0';
        const mockStream = { isTTY: true } as NodeJS.WriteStream;
        const result = supportsHyperlinks(mockStream);
        assert.equal(result, false);
      } finally {
        if (originalForce === undefined) {
          delete process.env.FORCE_HYPERLINK;
        } else {
          process.env.FORCE_HYPERLINK = originalForce;
        }
        if (originalVte === undefined) {
          delete process.env.VTE_VERSION;
        } else {
          process.env.VTE_VERSION = originalVte;
        }
      }
    });

    it('should return false for VTE 0.50.0 (compact format "5000") due to segfault bug', () => {
      const originalForce = process.env.FORCE_HYPERLINK;
      const originalVte = process.env.VTE_VERSION;
      try {
        delete process.env.FORCE_HYPERLINK;
        process.env.VTE_VERSION = '5000';
        const mockStream = { isTTY: true } as NodeJS.WriteStream;
        const result = supportsHyperlinks(mockStream);
        assert.equal(result, false);
      } finally {
        if (originalForce === undefined) {
          delete process.env.FORCE_HYPERLINK;
        } else {
          process.env.FORCE_HYPERLINK = originalForce;
        }
        if (originalVte === undefined) {
          delete process.env.VTE_VERSION;
        } else {
          process.env.VTE_VERSION = originalVte;
        }
      }
    });

    it('should return true for VTE 0.50.1 (compact format "5001")', () => {
      const originalForce = process.env.FORCE_HYPERLINK;
      const originalVte = process.env.VTE_VERSION;
      try {
        delete process.env.FORCE_HYPERLINK;
        process.env.VTE_VERSION = '5001';
        const mockStream = { isTTY: true } as NodeJS.WriteStream;
        const result = supportsHyperlinks(mockStream);
        assert.equal(result, true);
      } finally {
        if (originalForce === undefined) {
          delete process.env.FORCE_HYPERLINK;
        } else {
          process.env.FORCE_HYPERLINK = originalForce;
        }
        if (originalVte === undefined) {
          delete process.env.VTE_VERSION;
        } else {
          process.env.VTE_VERSION = originalVte;
        }
      }
    });
  });

  describe('linkifyUrls()', () => {
    it('should return text unchanged when hyperlinks not supported', () => {
      const mockStream = { isTTY: false } as NodeJS.WriteStream;
      const text = 'Visit https://example.com for more info';
      const result = linkifyUrls(text, mockStream);
      assert.equal(result, text);
    });

    it('should linkify URLs when hyperlinks are supported', () => {
      const originalEnv = process.env.FORCE_HYPERLINK;
      try {
        process.env.FORCE_HYPERLINK = '1';
        const text = 'Visit https://example.com for more info';
        const result = linkifyUrls(text);
        // Should contain OSC 8 sequences
        assert.ok(result.includes('\x1b]8'));
        // Should still contain the URL
        assert.ok(result.includes('https://example.com'));
      } finally {
        if (originalEnv === undefined) {
          delete process.env.FORCE_HYPERLINK;
        } else {
          process.env.FORCE_HYPERLINK = originalEnv;
        }
      }
    });

    it('should linkify multiple URLs', () => {
      const originalEnv = process.env.FORCE_HYPERLINK;
      try {
        process.env.FORCE_HYPERLINK = '1';
        const text = 'See https://foo.com and https://bar.com';
        const result = linkifyUrls(text);
        // Count OSC 8 opening sequences (should be 2)
        // eslint-disable-next-line no-control-regex
        const matches = result.match(/\x1b\]8;;https:\/\//g);
        assert.equal(matches?.length, 2);
      } finally {
        if (originalEnv === undefined) {
          delete process.env.FORCE_HYPERLINK;
        } else {
          process.env.FORCE_HYPERLINK = originalEnv;
        }
      }
    });

    it('should handle http URLs', () => {
      const originalEnv = process.env.FORCE_HYPERLINK;
      try {
        process.env.FORCE_HYPERLINK = '1';
        const text = 'Visit http://example.com for more';
        const result = linkifyUrls(text);
        assert.ok(result.includes('\x1b]8;;http://example.com'));
      } finally {
        if (originalEnv === undefined) {
          delete process.env.FORCE_HYPERLINK;
        } else {
          process.env.FORCE_HYPERLINK = originalEnv;
        }
      }
    });

    it('should not linkify non-URL text', () => {
      const originalEnv = process.env.FORCE_HYPERLINK;
      try {
        process.env.FORCE_HYPERLINK = '1';
        const text = 'No URLs here, just plain text';
        const result = linkifyUrls(text);
        assert.equal(result, text);
      } finally {
        if (originalEnv === undefined) {
          delete process.env.FORCE_HYPERLINK;
        } else {
          process.env.FORCE_HYPERLINK = originalEnv;
        }
      }
    });
  });
});
