import {expect,it} from 'vitest';
import expected from './v188_continuation.expected.json';
import {v188Continuation} from './helpers/v188ref';
it('preserves the rules-188 ordinary river continuation',()=>{
 const {source,...data}=expected;expect(v188Continuation()).toEqual(data);
},120000);
