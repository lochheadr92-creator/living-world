import { expect, it } from 'vitest';
import reference from './v44_continuation.expected.json';
import { v44Continuation } from './helpers/v44ref';
it('preserves rules 44 full saved-state continuation before food fetch promises', () => {
  const { source, ...expected } = reference;
  expect(v44Continuation()).toEqual(expected);
}, 125000);
