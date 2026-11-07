import {expect,it} from 'vitest';
import expected from './v163_continuation.expected.json';
import {v163Continuation} from './helpers/v163ref';
it('preserves the rules-163 ordinary econ-cc3 continuation',()=>{
 const {source,...data}=expected;expect(v163Continuation()).toEqual(data);
},240000);
