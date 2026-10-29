import { expect, it } from 'vitest';
import reference from './v41_continuation.expected.json';
import { v41Continuation } from './helpers/v41ref';
it('preserves rules 41 full saved-state continuation before learner-initiated instruction', () => {
  const { source, ...expected } = reference;
  expect(v41Continuation()).toEqual(expected);
}, 125000);
