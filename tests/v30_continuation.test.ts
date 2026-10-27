import { expect, it } from 'vitest';
import reference from './v30_continuation.expected.json';
import { v30Continuation } from './helpers/v30ref';
it('preserves rules 30 full saved-state continuation, before integrated work tastes', () => {
  const { source, ...expected } = reference;
  expect(v30Continuation()).toEqual(expected);
}, 125000);
