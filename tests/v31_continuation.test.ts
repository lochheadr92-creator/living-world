import { expect, it } from 'vitest';
import reference from './v31_continuation.expected.json';
import { v31Continuation } from './helpers/v31ref';
it('preserves rules 31 full saved-state continuation, before observer-facing truth', () => {
  const { source, ...expected } = reference;
  expect(v31Continuation()).toEqual(expected);
}, 125000);
