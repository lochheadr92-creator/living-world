import {expect,it} from 'vitest';
import expected from './v125_continuation.expected.json';
import {v125Continuation} from './helpers/v125ref';
it('preserves recorded rules-125 ordinary and paid carcass/product continuations',{timeout:300000},()=>{
 const {source,...recorded}=expected;expect(source.rules).toBe(125);expect(v125Continuation()).toEqual(recorded);
});
