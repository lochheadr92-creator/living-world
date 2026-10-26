import { expect, it } from 'vitest';
import reference from './v29_continuation.expected.json';
import { v29Continuation } from './helpers/v29ref';
it('preserves rules 29 full saved-state continuation, before layout claims', () => {
  const { source, ...expected } = reference;
  expect(v29Continuation()).toEqual(expected);
}, 125000);
