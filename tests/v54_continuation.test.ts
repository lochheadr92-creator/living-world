import { expect, it } from 'vitest';
import reference from './v54_continuation.expected.json';
import { v54Continuation } from './helpers/v54ref';
it('preserves rules 54 full saved-state continuation before rules 55', () => {
  const { source, ...expected } = reference;
  expect(v54Continuation()).toEqual(expected);
}, 125400);
