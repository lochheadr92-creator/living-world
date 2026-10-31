import {expect,it} from 'vitest';
import expected from './v105_continuation.expected.json';
import {v105Continuation} from './helpers/v105ref';
it('preserves rules-105 ordinary, set-aside, told and delivered continuations exactly',()=>{
 const {source,...recorded}=expected;expect(source).toContain('rules 105');expect(v105Continuation()).toEqual(recorded);
});
