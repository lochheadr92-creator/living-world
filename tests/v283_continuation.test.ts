import {expect,it} from 'vitest';
import expected from './v283_continuation.expected.json';
import {v283Continuation,V283_TICK} from './helpers/v283ref';
it('preserves the rules-283 ordinary gen-2 continuation (one pin for rules 283: a night of sleep)',()=>{
 const {source,...data}=expected;expect(v283Continuation(V283_TICK)).toEqual(data);
},1800000);
