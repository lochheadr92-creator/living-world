import {expect,it} from 'vitest';
import expected from './v195_continuation.expected.json';
import {v195Continuation} from './helpers/v195ref';
it('preserves the rules-195 ordinary gen-2 continuation',()=>{
 const {source,...data}=expected;expect(v195Continuation()).toEqual(data);
},120000);
