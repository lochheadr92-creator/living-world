import {expect,it} from 'vitest';
import expected from './v245_continuation.expected.json';
import {v245Continuation} from './helpers/v245ref';
it('preserves the rules-245 ordinary gen-2 continuation',()=>{
 const {source,...data}=expected;expect(v245Continuation()).toEqual(data);
},245000);
