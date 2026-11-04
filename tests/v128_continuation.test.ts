import {expect,it} from 'vitest';
import expected from './v128_continuation.expected.json';
import {v128Continuation} from './helpers/v128ref';
it('preserves recorded rules-128 ordinary and paid gear manufacture/placement/waiting continuations',{timeout:300000},()=>{
 const {source,...recorded}=expected;expect(source.rules).toBe(128);expect(v128Continuation()).toEqual(recorded);
});
