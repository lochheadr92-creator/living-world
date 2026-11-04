import {expect,it} from 'vitest';
import expected from './v160_continuation.expected.json';
import {v160Continuation} from './helpers/v160ref';
it('preserves the rules-160 ordinary meadow continuation',()=>{
 const {source,...data}=expected;expect(v160Continuation()).toEqual(data);
},180000);
