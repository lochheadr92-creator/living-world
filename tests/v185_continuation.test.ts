import {expect,it} from 'vitest';
import expected from './v185_continuation.expected.json';
import {v185Continuation} from './helpers/v185ref';
it('preserves the rules-185 ordinary river continuation',()=>{
 const {source,...data}=expected;expect(v185Continuation()).toEqual(data);
},120000);
