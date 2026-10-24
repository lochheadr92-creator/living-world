import { expect, it } from 'vitest';
import reference from './v20_continuation.expected.json';
import { v20Continuation } from './helpers/v20ref';
it('preserves local-main version 20 continuation', () => {
 const { source, ...expected } = reference;
 expect(v20Continuation()).toEqual(expected);
}, 120000);
