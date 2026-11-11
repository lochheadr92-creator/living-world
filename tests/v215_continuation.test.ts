import {expect,it} from 'vitest';
import expected from './v215_continuation.expected.json';
import {v215Continuation} from './helpers/v215ref';
it('preserves the rules-215 ordinary gen-2 continuation',()=>{
 const {source,...data}=expected;expect(v215Continuation()).toEqual(data);
},120000);
