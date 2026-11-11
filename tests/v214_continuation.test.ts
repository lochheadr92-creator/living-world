import {expect,it} from 'vitest';
import expected from './v214_continuation.expected.json';
import {v214Continuation} from './helpers/v214ref';
it('preserves the rules-214 ordinary gen-2 continuation',()=>{
 const {source,...data}=expected;expect(v214Continuation()).toEqual(data);
},120000);
