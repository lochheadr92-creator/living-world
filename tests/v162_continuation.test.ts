import {expect,it} from 'vitest';
import expected from './v162_continuation.expected.json';
import {v162Continuation} from './helpers/v162ref';
it('preserves the rules-162 ordinary river continuation',()=>{
 const {source,...data}=expected;expect(v162Continuation()).toEqual(data);
},180000);
