import {expect,it} from 'vitest';
import expected from './v205_continuation.expected.json';
import {v205Continuation} from './helpers/v205ref';
it('preserves the rules-205 ordinary gen-2 continuation',()=>{
 const {source,...data}=expected;expect(v205Continuation()).toEqual(data);
},120000);
