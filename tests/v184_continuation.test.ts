import {expect,it} from 'vitest';
import expected from './v184_continuation.expected.json';
import {v184Continuation} from './helpers/v184ref';
it('preserves the rules-184 ordinary birch continuation',()=>{
 const {source,...data}=expected;expect(v184Continuation()).toEqual(data);
},600000);

