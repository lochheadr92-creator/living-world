import {expect,it} from 'vitest';
import expected from './v216_continuation.expected.json';
import {v216Continuation} from './helpers/v216ref';
it('preserves the rules-216 ordinary gen-2 continuation',()=>{
 const {source,...data}=expected;expect(v216Continuation()).toEqual(data);
},120000);
