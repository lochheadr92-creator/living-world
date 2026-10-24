import { expect, it } from 'vitest';
import reference from './v23_continuation.expected.json';
import { v23Continuation } from './helpers/v23ref';
it('preserves local-main version 23 continuation', () => {
 const { source, ...expected } = reference;
 expect(v23Continuation()).toEqual(expected);
}, 123000);
