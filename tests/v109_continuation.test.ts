import {expect,it} from 'vitest';
import expected from './v109_continuation.expected.json';
import {v109Continuation} from './helpers/v109ref';
it('preserves rules-109 ordinary, final construction and replacement use exactly',()=>{
 const {source,...recorded}=expected;expect(source).toContain('rules 109 before successor behaviour');expect(v109Continuation()).toEqual(recorded);
});
