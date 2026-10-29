import { expect, it } from 'vitest';
import reference from './v40_continuation.expected.json';
import { v40Continuation } from './helpers/v40ref';
it('preserves rules 40 full saved-state continuation before learner-initiated instruction', () => {
  const { source, ...expected } = reference;
  expect(v40Continuation()).toEqual(expected);
}, 125000);
