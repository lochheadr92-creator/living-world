import {expect,it} from 'vitest';
import expected from './v252_continuation.expected.json';
import {v252Continuation,V252_TICK} from './helpers/v252ref';
it('preserves the rules-252 ordinary gen-4 continuation',()=>{
 const {source,...data}=expected;expect(v252Continuation(V252_TICK)).toEqual(data);
},245000);
