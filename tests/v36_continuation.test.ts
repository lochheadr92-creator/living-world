import { expect, it } from 'vitest';
import reference from './v36_continuation.expected.json';
import { v36Continuation } from './helpers/v36ref';
it('preserves rules 36 full saved-state continuation, rules 36 before achievement aftermath', () => {
  const { source, ...expected } = reference;
  expect(v36Continuation()).toEqual(expected);
}, 125000);
