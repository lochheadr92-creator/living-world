import {expect,it} from 'vitest';
import expected from './v244_continuation.expected.json';
import {v244Continuation} from './helpers/v244ref';
it('preserves the rules-244 ordinary gen-2 continuation',()=>{
 const {source,...data}=expected;expect(v244Continuation()).toEqual(data);
},244000);
