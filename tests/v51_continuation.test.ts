import { expect, it } from 'vitest';
import reference from './v51_continuation.expected.json';
import { v51Continuation } from './helpers/v51ref';
it('preserves rules 51 full saved-state continuation before batch plans', () => {
  const { source, ...expected } = reference;
  expect(v51Continuation()).toEqual(expected);
}, 125100);
