import {expect,it} from 'vitest';
import expected from './v212_continuation.expected.json';
import {v212Continuation} from './helpers/v212ref';
it('preserves the rules-212 ordinary gen-2 continuation',()=>{
 const {source,...data}=expected;expect(v212Continuation()).toEqual(data);
},120000);
