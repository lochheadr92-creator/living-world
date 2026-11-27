import {expect,it} from 'vitest';
import expected from './v282_continuation.expected.json';
import {v282Continuation,V282_TICK} from './helpers/v282ref';
it('preserves the rules-282 ordinary gen-2 continuation (one pin for rules 282: the review repairs of 28 November 2026)',()=>{
 const {source,...data}=expected;expect(v282Continuation(V282_TICK)).toEqual(data);
},1800000);
