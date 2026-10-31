import {expect,it} from 'vitest';
import expected from './v99_continuation.expected.json';
import {v99Continuation} from './helpers/v99ref';
it('preserves rules-99 ordinary, prepared, built, used and lost-component continuations exactly',()=>{
 const {source,...recorded}=expected;expect(source).toContain('rules 99');expect(v99Continuation()).toEqual(recorded);
});
