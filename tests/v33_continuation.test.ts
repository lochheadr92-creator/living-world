import { expect, it } from 'vitest';
import reference from './v33_continuation.expected.json';
import { v33Continuation } from './helpers/v33ref';
it('preserves rules 33 full saved-state continuation, before winter shelter', () => {
  const { source, ...expected } = reference;
  expect(v33Continuation()).toEqual(expected);
}, 180000);
