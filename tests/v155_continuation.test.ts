import {expect,it} from 'vitest';
import expected from './v155_continuation.expected.json';
import {v155Continuation} from './helpers/v155ref';
it('preserves the rules-155 ordinary river continuation',()=>{
 const {source,...data}=expected;expect(v155Continuation()).toEqual(data);
},180000);
