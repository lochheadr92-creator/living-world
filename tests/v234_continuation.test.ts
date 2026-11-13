import {expect,it} from 'vitest';
import expected from './v234_continuation.expected.json';
import {v234Continuation} from './helpers/v234ref';
it('preserves the rules-234 ordinary aspen continuation',()=>{
 const {source,...data}=expected;expect(v234Continuation()).toEqual(data);
},240000);
