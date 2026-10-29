import { expect, it } from 'vitest';
import reference from './v52_continuation.expected.json';
import { v52Continuation } from './helpers/v52ref';
it('preserves rules 52 full saved-state continuation before batch plans', () => {
  const { source, ...expected } = reference;
  expect(v52Continuation()).toEqual(expected);
}, 125200);
