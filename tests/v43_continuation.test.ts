import { expect, it } from 'vitest';
import reference from './v43_continuation.expected.json';
import { v43Continuation } from './helpers/v43ref';
it('preserves rules 43 full saved-state continuation before varied starting backgrounds', () => {
  const { source, ...expected } = reference;
  expect(v43Continuation()).toEqual(expected);
}, 125000);
