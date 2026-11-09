import {expect,it} from 'vitest';
import expected from './v183_continuation.expected.json';
import {v183Continuation} from './helpers/v183ref';
it('preserves the rules-183 ordinary birch continuation',()=>{
 const {source,...data}=expected;expect(v183Continuation()).toEqual(data);
},120000);
