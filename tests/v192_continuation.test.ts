import {expect,it} from 'vitest';
import expected from './v192_continuation.expected.json';
import {v192Continuation} from './helpers/v192ref';
it('preserves the rules-192 ordinary gen-2 continuation',()=>{
 const {source,...data}=expected;expect(v192Continuation()).toEqual(data);
},120000);
