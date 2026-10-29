import { expect, it } from 'vitest';
import reference from './v48_continuation.expected.json';
import { v48Continuation } from './helpers/v48ref';
it('preserves rules 48 full saved-state continuation before the next slice', () => {
  const { source, ...expected } = reference;
  expect(v48Continuation()).toEqual(expected);
}, 125000);
