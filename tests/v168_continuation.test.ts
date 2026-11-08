import {expect,it} from 'vitest';
import expected from './v168_continuation.expected.json';
import {v168Continuation} from './helpers/v168ref';
it('preserves the rules-168 ordinary birch continuation',()=>{
 const {source,...data}=expected;expect(v168Continuation()).toEqual(data);
},120000);
