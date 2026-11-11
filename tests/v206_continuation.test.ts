import {expect,it} from 'vitest';
import expected from './v206_continuation.expected.json';
import {v206Continuation} from './helpers/v206ref';
it('preserves the rules-206 ordinary gen-2 continuation',()=>{
 const {source,...data}=expected;expect(v206Continuation()).toEqual(data);
},120000);
