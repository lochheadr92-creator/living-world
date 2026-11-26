import {expect,it} from 'vitest';
import expected from './v278_continuation.expected.json';
import {v278Continuation,V278_TICK} from './helpers/v278ref';
it('preserves the rules-278 ordinary gen-2 continuation (one pin for rules 278: the worrier sets out once somebody has promised to come)',()=>{
 const {source,...data}=expected;expect(v278Continuation(V278_TICK)).toEqual(data);
},1800000);
