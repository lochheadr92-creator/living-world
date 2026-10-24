import { expect, it } from 'vitest';
import reference from './v14_continuation.expected.json';
import { v14Continuation } from './helpers/v14ref';
it('preserves local-main version 14 continuation', () => {
 const { source, ...expected } = reference;
 expect(v14Continuation()).toEqual(expected);
}, 120000);
