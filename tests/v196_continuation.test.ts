import {expect,it} from 'vitest';
import expected from './v196_continuation.expected.json';
import {v196Continuation} from './helpers/v196ref';
it('preserves the rules-196 ordinary gen-2 continuation',()=>{
 const {source,...data}=expected;expect(v196Continuation()).toEqual(data);
},120000);
