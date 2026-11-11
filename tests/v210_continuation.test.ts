import {expect,it} from 'vitest';
import expected from './v210_continuation.expected.json';
import {v210Continuation} from './helpers/v210ref';
it('preserves the rules-210 ordinary gen-2 continuation',()=>{
 const {source,...data}=expected;expect(v210Continuation()).toEqual(data);
},120000);
