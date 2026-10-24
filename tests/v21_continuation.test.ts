import { expect, it } from 'vitest';
import reference from './v21_continuation.expected.json';
import { v21Continuation } from './helpers/v21ref';
it('preserves local-main version 21 continuation', () => {
 const { source, ...expected } = reference;
 expect(v21Continuation()).toEqual(expected);
}, 121000);
