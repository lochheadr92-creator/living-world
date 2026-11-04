import {expect,it} from 'vitest';
import expected from './v158_continuation.expected.json';
import {v158Continuation} from './helpers/v158ref';
it('preserves the rules-158 ordinary meadow continuation',()=>{
 const {source,...data}=expected;expect(v158Continuation()).toEqual(data);
},180000);
