import {expect,it} from 'vitest';
import expected from './v202_continuation.expected.json';
import {v202Continuation} from './helpers/v202ref';
it('preserves the rules-202 ordinary gen-2 continuation',()=>{
 const {source,...data}=expected;expect(v202Continuation()).toEqual(data);
},120000);
