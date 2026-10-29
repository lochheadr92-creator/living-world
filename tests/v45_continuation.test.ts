import { expect, it } from 'vitest';
import reference from './v45_continuation.expected.json';
import { v45Continuation } from './helpers/v45ref';
it('preserves rules 45 full saved-state continuation before the winter reserve', () => {
  const { source, ...expected } = reference;
  expect(v45Continuation()).toEqual(expected);
}, 125000);
