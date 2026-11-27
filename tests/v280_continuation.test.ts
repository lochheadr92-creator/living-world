import {expect,it} from 'vitest';
import expected from './v280_continuation.expected.json';
import {v280Continuation,V280_TICK} from './helpers/v280ref';
it('preserves the rules-280 ordinary gen-2 continuation (one pin for rules 280: a little one goes to bed at dark and sleeps till morning)',()=>{
 const {source,...data}=expected;expect(v280Continuation(V280_TICK)).toEqual(data);
},1800000);
