import { expect, it } from 'vitest';
import reference from './v42_continuation.expected.json';
import { v42Continuation } from './helpers/v42ref';
it('preserves rules 42 full saved-state continuation before learner-initiated instruction', () => {
  const { source, ...expected } = reference;
  expect(v42Continuation()).toEqual(expected);
}, 125000);
