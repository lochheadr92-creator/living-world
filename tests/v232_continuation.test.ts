import {expect,it} from 'vitest';
import expected from './v232_continuation.expected.json';
import {v232Continuation} from './helpers/v232ref';
it('preserves the rules-232 ordinary aspen continuation',()=>{
 const {source,...data}=expected;expect(v232Continuation()).toEqual(data);
},240000);
