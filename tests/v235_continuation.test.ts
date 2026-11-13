import {expect,it} from 'vitest';
import expected from './v235_continuation.expected.json';
import {v235Continuation} from './helpers/v235ref';
it('preserves the rules-235 ordinary river continuation',()=>{
 const {source,...data}=expected;expect(v235Continuation()).toEqual(data);
},240000);
