/**
 * Type-level tests for transforms and parser combinators.
 *
 * TODO: Rewrite for new combinator API
 */
import { describe, test } from 'node:test';

describe('Parser type inference', () => {
  test.todo('opt.options() infers values type');
  test.todo('pos.positionals() infers tuple type');
  test.todo('map() infers transformed type');
  test.todo('pipe() composes types correctly');
});

describe('Command type inference', () => {
  test.todo('handle() infers handler parameter type');
  test.todo('handler receives globals + locals merged');
});
