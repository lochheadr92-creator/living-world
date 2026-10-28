import { expect, it } from 'vitest';
import reference from './v39_continuation.expected.json';
import { v39Continuation } from './helpers/v39ref';
it('preserves rules 39 full saved-state continuation before stored material supply', () => {
  const { source, ...expected } = reference;
  expect(v39Continuation()).toEqual(expected);
}, 125000);
