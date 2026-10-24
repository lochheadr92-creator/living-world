import { expect, it } from 'vitest';
import reference from './v18_continuation.expected.json';
import { v18Continuation } from './helpers/v18ref';
it('preserves local-main version 18 continuation', () => {
 const { source, ...expected } = reference;
 expect(v18Continuation()).toEqual(expected);
}, 120000);
