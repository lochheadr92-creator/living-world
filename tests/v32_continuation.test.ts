import { expect, it } from 'vitest';
import reference from './v32_continuation.expected.json';
import { v32Continuation } from './helpers/v32ref';
it('preserves rules 32 full saved-state continuation, before leave-heaviest', () => {
  const { source, ...expected } = reference;
  expect(v32Continuation()).toEqual(expected);
}, 180000);
