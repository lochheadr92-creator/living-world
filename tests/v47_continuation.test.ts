import { expect, it } from 'vitest';
import reference from './v47_continuation.expected.json';
import { v47Continuation } from './helpers/v47ref';
it('preserves rules 47 full saved-state continuation before the agreed delivery place', () => {
  const { source, ...expected } = reference;
  expect(v47Continuation()).toEqual(expected);
}, 125000);
