import { expect, it } from 'vitest';
import reference from './v50_continuation.expected.json';
import { v50Continuation } from './helpers/v50ref';
it('preserves rules 50 full saved-state continuation before batch plans', () => {
  const { source, ...expected } = reference;
  expect(v50Continuation()).toEqual(expected);
}, 125000);
