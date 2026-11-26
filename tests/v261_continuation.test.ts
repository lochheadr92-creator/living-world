import {expect,it} from 'vitest';
import expected from './v261_continuation.expected.json';
import {v261Continuation,V261_TICK} from './helpers/v261ref';
it('preserves the rules-261 ordinary gen-2 continuation',()=>{
 const {source,...data}=expected;expect(v261Continuation(V261_TICK)).toEqual(data);
},360000);
