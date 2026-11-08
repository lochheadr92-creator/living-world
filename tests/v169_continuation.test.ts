import {expect,it} from 'vitest';
import expected from './v169_continuation.expected.json';
import {v169Continuation} from './helpers/v169ref';
it('preserves the rules-169 ordinary birch continuation',()=>{
 const {source,...data}=expected;expect(v169Continuation()).toEqual(data);
},120000);
