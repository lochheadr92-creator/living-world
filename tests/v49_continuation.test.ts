import { expect, it } from 'vitest';
import reference from './v49_continuation.expected.json';
import { v49Continuation } from './helpers/v49ref';
it('preserves rules 49 full saved-state continuation before batch plans', () => {
  const { source, ...expected } = reference;
  expect(v49Continuation()).toEqual(expected);
}, 125000);
