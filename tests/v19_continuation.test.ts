import { expect, it } from 'vitest';
import reference from './v19_continuation.expected.json';
import { v19Continuation } from './helpers/v19ref';
it('preserves local-main version 19 continuation', () => {
 const { source, ...expected } = reference;
 expect(v19Continuation()).toEqual(expected);
}, 120000);
