import { expect, it } from 'vitest';
import reference from './v16_continuation.expected.json';
import { v16Continuation } from './helpers/v16ref';
it('preserves local-main version 16 continuation', () => {
 const { source, ...expected } = reference;
 expect(v16Continuation()).toEqual(expected);
}, 120000);
