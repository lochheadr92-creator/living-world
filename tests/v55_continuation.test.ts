import { expect, it } from 'vitest';
import reference from './v55_continuation.expected.json';
import { v55Continuation } from './helpers/v55ref';
it('preserves rules 55 full saved-state continuation before rules 56', () => {
  const { source, ...expected } = reference;
  expect(v55Continuation()).toEqual(expected);
}, 125500);
