import {expect,it} from 'vitest';
import expected from './v250_continuation.expected.json';
import {v250Continuation,V250_TICK} from './helpers/v250ref';
it('preserves the rules-250 ordinary gen-4 continuation',()=>{
 const {source,...data}=expected;expect(v250Continuation(V250_TICK)).toEqual(data);
},245000);
