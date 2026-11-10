import {expect,it} from 'vitest';
import expected from './v194_continuation.expected.json';
import {v194Continuation} from './helpers/v194ref';
it('preserves the rules-194 ordinary gen-2 continuation',()=>{
 const {source,...data}=expected;expect(v194Continuation()).toEqual(data);
},120000);
