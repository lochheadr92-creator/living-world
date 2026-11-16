import {expect,it} from 'vitest';
import expected from './v254_continuation.expected.json';
import {v254Continuation,V254_TICK} from './helpers/v254ref';
it('preserves the rules-254 ordinary gen-4 continuation',()=>{
 const {source,...data}=expected;expect(v254Continuation(V254_TICK)).toEqual(data);
},245000);
