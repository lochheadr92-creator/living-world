import {expect,it} from 'vitest';
import expected from './v152_continuation.expected.json';
import {v152Continuation} from './helpers/v152ref';
it('preserves the rules-152 ordinary forest continuation',()=>{
 const {source,...data}=expected;expect(v152Continuation()).toEqual(data);
},180000);
