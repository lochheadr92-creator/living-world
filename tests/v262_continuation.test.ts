import {expect,it} from 'vitest';
import expected from './v262_continuation.expected.json';
import {v262Continuation,V262_TICK} from './helpers/v262ref';
it('preserves the rules-262 ordinary gen-2 continuation',()=>{
 const {source,...data}=expected;expect(v262Continuation(V262_TICK)).toEqual(data);
},1800000);
