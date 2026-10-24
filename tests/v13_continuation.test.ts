import { expect, it } from 'vitest';
import reference from './v13_continuation.expected.json';
import { v13Continuation } from './helpers/v13ref';
it('preserves local-main version 13 continuation', () => {
 const { source, ...expected } = reference;
 expect(v13Continuation()).toEqual(expected);
}, 120000);
