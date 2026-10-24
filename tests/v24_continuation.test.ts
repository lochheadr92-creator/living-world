import { expect, it } from 'vitest';
import reference from './v24_continuation.expected.json';
import { v24Continuation } from './helpers/v24ref';
it('preserves local-main version 24 continuation', () => {
 const { source, ...expected } = reference;
 expect(v24Continuation()).toEqual(expected);
}, 124000);
