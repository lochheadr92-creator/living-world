import { expect, it } from 'vitest';
import reference from './v26_continuation.expected.json';
import { v26Continuation } from './helpers/v26ref';
it('preserves version 26 continuation', () => {
 const { source, ...expected } = reference;
 expect(v26Continuation()).toEqual(expected);
}, 125000);
