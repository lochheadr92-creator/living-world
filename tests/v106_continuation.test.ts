import {expect,it} from 'vitest';
import expected from './v106_continuation.expected.json';
import {v106Continuation} from './helpers/v106ref';
it('preserves rules-106 ordinary, unseen, seen, set-out and after-care continuations exactly',()=>{
 const {source,...recorded}=expected;expect(source).toContain('rules 106');expect(v106Continuation()).toEqual(recorded);
});
