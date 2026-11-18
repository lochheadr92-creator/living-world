import {expect,it} from 'vitest';
import expected from './v256_continuation.expected.json';
import {v256Continuation,V256_TICK} from './helpers/v256ref';
it('preserves the rules-256 ordinary gen-4 continuation',()=>{
 const {source,...data}=expected;expect(v256Continuation(V256_TICK)).toEqual(data);
},245000);
