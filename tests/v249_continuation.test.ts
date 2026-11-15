import {expect,it} from 'vitest';
import expected from './v249_continuation.expected.json';
import {v249Continuation,V249_TICK} from './helpers/v249ref';
it('preserves the rules-249 ordinary gen-2 continuation',()=>{
 const {source,...data}=expected;expect(v249Continuation(V249_TICK)).toEqual(data);
},245000);
