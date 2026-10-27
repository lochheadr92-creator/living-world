import { expect, it } from 'vitest';
import reference from './v34_continuation.expected.json';
import { v34Continuation } from './helpers/v34ref';
it('preserves rules 34 full saved-state continuation, before crew re-entry consistency', () => {
  const { source, ...expected } = reference;
  expect(v34Continuation()).toEqual(expected);
}, 125000);
