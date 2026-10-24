import { expect, it } from 'vitest';
import reference from './v22_continuation.expected.json';
import { v22Continuation } from './helpers/v22ref';
it('preserves local-main version 22 continuation', () => {
 const { source, ...expected } = reference;
 expect(v22Continuation()).toEqual(expected);
}, 122000);
