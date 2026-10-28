import { expect, it } from 'vitest';
import reference from './v37_continuation.expected.json';
import { v37Continuation } from './helpers/v37ref';
it('preserves rules 37 full saved-state continuation, rules 37 before achievement aftermath', () => {
  const { source, ...expected } = reference;
  expect(v37Continuation()).toEqual(expected);
}, 125000);
