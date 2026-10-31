import {expect,it} from 'vitest';
import expected from './v90_continuation.expected.json';
import {v90Continuation} from './helpers/v90ref';
it('preserves rules-90 ordinary, shared table, recovery travel and limited handling continuations exactly',()=>{
 const {source,...recorded}=expected;expect(v90Continuation()).toEqual(recorded);
},120000);
