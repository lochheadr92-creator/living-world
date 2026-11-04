import {expect,it} from 'vitest';
import expected from './v156_continuation.expected.json';
import {v156Continuation} from './helpers/v156ref';
it('preserves the rules-156 ordinary meadow continuation',()=>{
 const {source,...data}=expected;expect(v156Continuation()).toEqual(data);
},180000);
