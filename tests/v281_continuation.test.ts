import {expect,it} from 'vitest';
import expected from './v281_continuation.expected.json';
import {v281Continuation,V281_TICK} from './helpers/v281ref';
it('preserves the rules-281 ordinary gen-2 continuation (one pin for rules 281: the hall repair: news at the hall, a meal spot one can stand on, an evening at the hall)',()=>{
 const {source,...data}=expected;expect(v281Continuation(V281_TICK)).toEqual(data);
},1800000);
