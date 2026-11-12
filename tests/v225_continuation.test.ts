import {expect,it} from 'vitest';
import expected from './v225_continuation.expected.json';
import {v225Continuation} from './helpers/v225ref';
it('preserves the rules-225 ordinary river continuation',()=>{
 const {source,...data}=expected;expect(v225Continuation()).toEqual(data);
},120000);
