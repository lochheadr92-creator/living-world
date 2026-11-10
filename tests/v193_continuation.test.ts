import {expect,it} from 'vitest';
import expected from './v193_continuation.expected.json';
import {v193Continuation} from './helpers/v193ref';
it('preserves the rules-193 ordinary gen-2 continuation',()=>{
 const {source,...data}=expected;expect(v193Continuation()).toEqual(data);
},120000);
