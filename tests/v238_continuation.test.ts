import {expect,it} from 'vitest';
import expected from './v238_continuation.expected.json';
import {v238Continuation} from './helpers/v238ref';
it('preserves the rules-238 ordinary birch continuation',()=>{
 const {source,...data}=expected;expect(v238Continuation()).toEqual(data);
},240000);
