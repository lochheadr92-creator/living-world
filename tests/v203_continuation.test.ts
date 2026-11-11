import {expect,it} from 'vitest';
import expected from './v203_continuation.expected.json';
import {v203Continuation} from './helpers/v203ref';
it('preserves the rules-203 ordinary gen-2 continuation',()=>{
 const {source,...data}=expected;expect(v203Continuation()).toEqual(data);
},120000);
