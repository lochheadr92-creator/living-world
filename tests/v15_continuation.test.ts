import { expect, it } from 'vitest';
import reference from './v15_continuation.expected.json';
import { v15Continuation } from './helpers/v15ref';
it('preserves local-main version 15 continuation', () => {
 const { source, ...expected } = reference;
 expect(v15Continuation()).toEqual(expected);
}, 120000);
