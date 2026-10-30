import { expect, it } from 'vitest';
import expected from './v59_continuation.expected.json';
import { v59Continuation } from './helpers/v59ref';
it('preserves the rules-59 ordinary and active-cart full serialized continuations', () => {
  const { source, ...reference } = expected;
  expect(v59Continuation()).toEqual(reference);
}, 120000);
