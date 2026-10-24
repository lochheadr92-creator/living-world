import { expect, it } from 'vitest';
import reference from './v17_continuation.expected.json';
import { v17Continuation } from './helpers/v17ref';
it('preserves local-main version 17 continuation', () => {
 const { source, ...expected } = reference;
 expect(v17Continuation()).toEqual(expected);
}, 120000);
