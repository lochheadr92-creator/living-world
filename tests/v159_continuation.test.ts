import {expect,it} from 'vitest';
import expected from './v159_continuation.expected.json';
import {v159Continuation} from './helpers/v159ref';
it('preserves the rules-159 ordinary meadow continuation',()=>{
 const {source,...data}=expected;expect(v159Continuation()).toEqual(data);
},180000);
