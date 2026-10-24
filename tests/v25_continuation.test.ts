import { expect, it } from 'vitest';
import reference from './v25_continuation.expected.json';
import { v25Continuation } from './helpers/v25ref';
it('preserves local-main version 25 continuation', () => {
 const { source, ...expected } = reference;
 expect(v25Continuation()).toEqual(expected);
}, 125000);
