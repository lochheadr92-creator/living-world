import {expect,it} from 'vitest';
import expected from './v164_continuation.expected.json';
import {v164Continuation} from './helpers/v164ref';
it('preserves the rules-164 ordinary birch continuation',()=>{
 const {source,...data}=expected;expect(v164Continuation()).toEqual(data);
},240000);
