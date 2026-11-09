import {expect,it} from 'vitest';
import expected from './v178_continuation.expected.json';
import {v178Continuation} from './helpers/v178ref';
it('preserves the rules-178 ordinary river continuation',()=>{
 const {source,...data}=expected;expect(v178Continuation()).toEqual(data);
},120000);
