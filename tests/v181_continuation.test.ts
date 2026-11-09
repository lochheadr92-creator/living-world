import {expect,it} from 'vitest';
import expected from './v181_continuation.expected.json';
import {v181Continuation} from './helpers/v181ref';
it('preserves the rules-181 ordinary birch continuation',()=>{
 const {source,...data}=expected;expect(v181Continuation()).toEqual(data);
},600000);
