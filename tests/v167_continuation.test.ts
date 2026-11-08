import {expect,it} from 'vitest';
import expected from './v167_continuation.expected.json';
import {v167Continuation} from './helpers/v167ref';
it('preserves the rules-167 ordinary forest continuation',()=>{
 const {source,...data}=expected;expect(v167Continuation()).toEqual(data);
},240000);
