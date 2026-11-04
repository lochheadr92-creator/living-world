import {expect,it} from 'vitest';
import expected from './v130_continuation.expected.json';
import {v130Continuation} from './helpers/v130ref';
it('preserves recorded rules-130 ordinary and known-carcass supply continuations',{timeout:300000},()=>{
 const {source,...recorded}=expected;expect(source.rules).toBe(130);expect(v130Continuation()).toEqual(recorded);
});
