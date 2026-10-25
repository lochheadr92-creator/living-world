import { expect, it } from 'vitest';
import reference from './v27_continuation.expected.json';
import { v27Continuation } from './helpers/v27ref';
it('preserves main version 27 continuation', () => {
 const { source, ...expected } = reference;
 expect(v27Continuation()).toEqual(expected);
}, 125000);

