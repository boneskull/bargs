/**
 * Tests for transforms via map() combinator.
 *
 * TODO: Rewrite for new combinator API
 */
import { describe, it } from 'node:test';

describe('map()', () => {
  describe('values transforms', () => {
    it.todo('transforms values in pipeline');
    it.todo('infers transformed type');
  });

  describe('positionals transforms', () => {
    it.todo('transforms positionals in pipeline');
    it.todo('infers transformed tuple type');
  });

  describe('combined transforms', () => {
    it.todo('transforms both values and positionals');
  });

  describe('async transforms', () => {
    it.todo('supports async transform functions');
  });
});

describe('opt.map()', () => {
  it.todo('convenience for transforming just values');
});

describe('pos.map()', () => {
  it.todo('convenience for transforming just positionals');
});
