import {expect,it} from 'vitest';
import expected from './v176_continuation.expected.json';
import {v176Continuation} from './helpers/v176ref';
it('preserves the rules-176 ordinary birch continuation',()=>{
 const {source,...data}=expected;expect(v176Continuation()).toEqual(data);
},120000);
