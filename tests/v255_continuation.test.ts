import {expect,it} from 'vitest';
import expected from './v255_continuation.expected.json';
import {v255Continuation,V255_TICK} from './helpers/v255ref';
it('preserves the rules-255 ordinary gen-4 continuation',()=>{
 const {source,...data}=expected;expect(v255Continuation(V255_TICK)).toEqual(data);
},1800000);
