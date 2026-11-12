import {expect,it} from 'vitest';
import expected from './v228_continuation.expected.json';
import {v228Continuation} from './helpers/v228ref';
it('preserves the rules-228 ordinary aspen continuation',()=>{
 const {source,...data}=expected;expect(v228Continuation()).toEqual(data);
},120000);
