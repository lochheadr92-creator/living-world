import {expect,it} from 'vitest';
import expected from './v191_continuation.expected.json';
import {v191Continuation} from './helpers/v191ref';
it('preserves the rules-191 ordinary gen-2 continuation',()=>{
 const {source,...data}=expected;expect(v191Continuation()).toEqual(data);
},120000);
