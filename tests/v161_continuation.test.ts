import {expect,it} from 'vitest';
import expected from './v161_continuation.expected.json';
import {v161Continuation} from './helpers/v161ref';
it('preserves the rules-161 ordinary river continuation',()=>{
 const {source,...data}=expected;expect(v161Continuation()).toEqual(data);
},180000);
