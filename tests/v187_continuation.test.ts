import {expect,it} from 'vitest';
import expected from './v187_continuation.expected.json';
import {v187Continuation} from './helpers/v187ref';
it('preserves the rules-187 ordinary gen-2 continuation',()=>{
 const {source,...data}=expected;expect(v187Continuation()).toEqual(data);
},120000);
