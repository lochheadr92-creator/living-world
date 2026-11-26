import {expect,it} from 'vitest';
import expected from './v277_continuation.expected.json';
import {v277Continuation,V277_TICK} from './helpers/v277ref';
it('preserves the rules-277 ordinary gen-2 continuation (one pin for the merged rules 266 to 277)',()=>{
 const {source,...data}=expected;expect(v277Continuation(V277_TICK)).toEqual(data);
},360000);
