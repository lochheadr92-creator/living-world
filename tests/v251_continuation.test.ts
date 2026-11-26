import {expect,it} from 'vitest';
import expected from './v251_continuation.expected.json';
import {v251Continuation,V251_TICK} from './helpers/v251ref';
it('preserves the rules-251 ordinary gen-4 continuation',()=>{
 const {source,...data}=expected;expect(v251Continuation(V251_TICK)).toEqual(data);
},1800000);
