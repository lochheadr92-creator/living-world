import {expect,it} from 'vitest';
import expected from './v157_continuation.expected.json';
import {v157Continuation} from './helpers/v157ref';
it('preserves the rules-157 ordinary meadow continuation',()=>{
 const {source,...data}=expected;expect(v157Continuation()).toEqual(data);
},180000);
