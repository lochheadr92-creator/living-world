import { expect, it } from 'vitest';
import reference from './v12_continuation.expected.json';
import { v12Continuation } from './helpers/v12ref';
it('preserves local-main version 12 continuation', () => {
 const { source, ...expected } = reference;
 expect(v12Continuation()).toEqual(expected);
}, 120000);
