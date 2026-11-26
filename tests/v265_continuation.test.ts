import {expect,it} from 'vitest';
import expected from './v265_continuation.expected.json';
import {v265Continuation,V265_TICK} from './helpers/v265ref';
it('preserves the rules-265 ordinary gen-2 continuation',()=>{
 const {source,...data}=expected;expect(v265Continuation(V265_TICK)).toEqual(data);
},360000);
