import { expect, it } from 'vitest';
import reference from './v53_continuation.expected.json';
import { v53Continuation } from './helpers/v53ref';
it('preserves rules 53 full saved-state continuation before batch plans', () => {
  const { source, ...expected } = reference;
  expect(v53Continuation()).toEqual(expected);
}, 125300);
