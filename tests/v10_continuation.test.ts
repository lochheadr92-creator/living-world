import { expect, it } from 'vitest';
import reference from './v10_continuation.expected.json';
import { v10Continuation } from './helpers/v10ref';
it('preserves local-main version 10 continuation', () => {
 const { source, ...expected } = reference;
 expect(v10Continuation()).toEqual(expected);
}, 120000);
