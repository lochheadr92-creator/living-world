import {expect,it} from 'vitest';
import expected from './v204_continuation.expected.json';
import {v204Continuation} from './helpers/v204ref';
it('preserves the rules-204 ordinary gen-2 continuation',()=>{
 const {source,...data}=expected;expect(v204Continuation()).toEqual(data);
},120000);
