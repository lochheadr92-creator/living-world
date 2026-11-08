import {expect,it} from 'vitest';
import expected from './v173_continuation.expected.json';
import {v173Continuation} from './helpers/v173ref';
it('preserves the rules-173 ordinary birch continuation',()=>{
 const {source,...data}=expected;expect(v173Continuation()).toEqual(data);
},120000);
