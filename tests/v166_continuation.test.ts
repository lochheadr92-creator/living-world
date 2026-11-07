import {expect,it} from 'vitest';
import expected from './v166_continuation.expected.json';
import {v166Continuation} from './helpers/v166ref';
it('preserves the rules-166 ordinary birch continuation',()=>{
 const {source,...data}=expected;expect(v166Continuation()).toEqual(data);
},240000);
