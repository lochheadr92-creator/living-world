import {expect,it} from 'vitest';
import expected from './v94_continuation.expected.json';
import {v94Continuation} from './helpers/v94ref';
it('preserves rules-94 ordinary, heard handover, paid cover work and agreed return exactly',()=>{
 const {source,...recorded}=expected;expect(v94Continuation()).toEqual(recorded);
},120000);
