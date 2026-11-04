import {expect,it} from 'vitest';
import expected from './v131_continuation.expected.json';
import {v131Continuation} from './helpers/v131ref';
it('preserves recorded rules-131 ordinary and known-carcass supply continuations',{timeout:300000},()=>{
 const {source,...recorded}=expected;expect(source.rules).toBe(131);expect(v131Continuation()).toEqual(recorded);
});
