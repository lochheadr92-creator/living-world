import {expect,it} from 'vitest';
import expected from './v233_continuation.expected.json';
import {v233Continuation} from './helpers/v233ref';
it('preserves the rules-233 ordinary aspen continuation',()=>{
 const {source,...data}=expected;expect(v233Continuation()).toEqual(data);
},240000);
