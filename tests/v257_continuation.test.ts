import {expect,it} from 'vitest';
import expected from './v257_continuation.expected.json';
import {v257Continuation,V257_TICK} from './helpers/v257ref';
it('preserves the rules-257 ordinary gen-4 continuation',()=>{
 const {source,...data}=expected;expect(v257Continuation(V257_TICK)).toEqual(data);
},360000);
