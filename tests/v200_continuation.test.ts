import {expect,it} from 'vitest';
import expected from './v200_continuation.expected.json';
import {v200Continuation} from './helpers/v200ref';
it('preserves the rules-200 ordinary gen-2 continuation',()=>{
 const {source,...data}=expected;expect(v200Continuation()).toEqual(data);
},120000);
