import {expect,it} from 'vitest';
import expected from './v253_continuation.expected.json';
import {v253Continuation,V253_TICK} from './helpers/v253ref';
it('preserves the rules-253 ordinary gen-4 continuation',()=>{
 const {source,...data}=expected;expect(v253Continuation(V253_TICK)).toEqual(data);
},245000);
