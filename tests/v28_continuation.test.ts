import { expect, it } from 'vitest';
import reference from './v28_continuation.expected.json';
import { v28Continuation } from './helpers/v28ref';
it('preserves main version 28 continuation', () => {
 const { source, ...expected } = reference;
 expect(v28Continuation()).toEqual(expected);
}, 125000);

