import { expect, it } from 'vitest';
import reference from './v35_continuation.expected.json';
import { v35Continuation } from './helpers/v35ref';
it('preserves rules 35 full saved-state continuation, integration baseline 9871662 before further changes', () => {
  const { source, ...expected } = reference;
  expect(v35Continuation()).toEqual(expected);
}, 125000);
