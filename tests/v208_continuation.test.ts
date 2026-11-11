import {expect,it} from 'vitest';
import expected from './v208_continuation.expected.json';
import {v208Continuation} from './helpers/v208ref';
it('preserves the rules-208 ordinary gen-2 continuation',()=>{
 const {source,...data}=expected;expect(v208Continuation()).toEqual(data);
},120000);
