import {expect,it} from 'vitest';
import expected from './v240_continuation.expected.json';
import {v240Continuation} from './helpers/v240ref';
it('preserves the rules-240 ordinary birch continuation',()=>{
 const {source,...data}=expected;expect(v240Continuation()).toEqual(data);
},240000);
