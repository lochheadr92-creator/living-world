import {expect,it} from 'vitest';
import expected from './v182_continuation.expected.json';
import {v182Continuation} from './helpers/v182ref';
it('preserves the rules-182 ordinary birch continuation',()=>{
 const {source,...data}=expected;expect(v182Continuation()).toEqual(data);
},120000);
