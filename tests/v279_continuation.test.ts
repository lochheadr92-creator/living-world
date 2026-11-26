import {expect,it} from 'vitest';
import expected from './v279_continuation.expected.json';
import {v279Continuation,V279_TICK} from './helpers/v279ref';
it('preserves the rules-279 ordinary gen-2 continuation (one pin for rules 279: a child born on the way to the door leaves no lying-in mark)',()=>{
 const {source,...data}=expected;expect(v279Continuation(V279_TICK)).toEqual(data);
},1800000);
