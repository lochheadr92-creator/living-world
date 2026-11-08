import {expect,it} from 'vitest';
import expected from './v171_continuation.expected.json';
import {v171Continuation} from './helpers/v171ref';
it('preserves the rules-171 ordinary forest continuation',()=>{
 const {source,...data}=expected;expect(v171Continuation()).toEqual(data);
},180000);
