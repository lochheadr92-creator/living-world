import {expect,it} from 'vitest';
import expected from './v263_continuation.expected.json';
import {v263Continuation,V263_TICK} from './helpers/v263ref';
it('preserves the rules-263 ordinary gen-2 continuation',()=>{
 const {source,...data}=expected;expect(v263Continuation(V263_TICK)).toEqual(data);
},1800000);
