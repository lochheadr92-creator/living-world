import {expect,it} from 'vitest';
import expected from './v213_continuation.expected.json';
import {v213Continuation} from './helpers/v213ref';
it('preserves the rules-213 ordinary gen-2 continuation',()=>{
 const {source,...data}=expected;expect(v213Continuation()).toEqual(data);
},120000);
