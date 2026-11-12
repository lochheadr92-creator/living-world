import {expect,it} from 'vitest';
import expected from './v230_continuation.expected.json';
import {v230Continuation} from './helpers/v230ref';
it('preserves the rules-230 ordinary cedar continuation',()=>{
 const {source,...data}=expected;expect(v230Continuation()).toEqual(data);
},240000);
