import {expect,it} from 'vitest';
import expected from './v179_continuation.expected.json';
import {v179Continuation} from './helpers/v179ref';
it('preserves the rules-179 ordinary birch continuation',()=>{
 const {source,...data}=expected;expect(v179Continuation()).toEqual(data);
},120000);
