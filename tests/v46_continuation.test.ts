import { expect, it } from 'vitest';
import reference from './v46_continuation.expected.json';
import { v46Continuation } from './helpers/v46ref';
it('preserves rules 46 full saved-state continuation before winter shelter preparation', () => {
  const { source, ...expected } = reference;
  expect(v46Continuation()).toEqual(expected);
}, 125000);
