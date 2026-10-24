import { expect, it } from 'vitest';
import reference from './v11_continuation.expected.json';
import { v11Continuation } from './helpers/v11ref';
it('preserves local-main version 11 continuation', () => {
 const { source, ...expected } = reference;
 expect(v11Continuation()).toEqual(expected);
}, 120000);
