import {expect,it} from 'vitest';
import expected from './v284_continuation.expected.json';
import {v284Continuation,V284_TICK} from './helpers/v284ref';
it('preserves the rules-284 ordinary gen-2 continuation (one pin for rules 284: quiet company)',()=>{
 const {source,...data}=expected;expect(v284Continuation(V284_TICK)).toEqual(data);
},1800000);
