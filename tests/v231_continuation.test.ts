import {expect,it} from 'vitest';
import expected from './v231_continuation.expected.json';
import {v231Continuation} from './helpers/v231ref';
it('preserves the rules-231 ordinary aspen continuation',()=>{
 const {source,...data}=expected;expect(v231Continuation()).toEqual(data);
},240000);
