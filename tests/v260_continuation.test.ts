import {expect,it} from 'vitest';
import expected from './v260_continuation.expected.json';
import {v260Continuation,V260_TICK} from './helpers/v260ref';
it('preserves the rules-260 ordinary gen-2 continuation',()=>{
 const {source,...data}=expected;expect(v260Continuation(V260_TICK)).toEqual(data);
},1800000);
