import { expect, it } from 'vitest';
import reference from './v38_continuation.expected.json';
import { v38Continuation } from './helpers/v38ref';
it('preserves rules 38 full saved-state continuation before project-helper choice', () => {
  const { source, ...expected } = reference;
  expect(v38Continuation()).toEqual(expected);
}, 125000);
