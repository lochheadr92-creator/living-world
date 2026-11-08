import {expect,it} from 'vitest';
import expected from './v170_continuation.expected.json';
import {v170Continuation} from './helpers/v170ref';
it('preserves the rules-170 ordinary birch continuation',()=>{
 const {source,...data}=expected;expect(v170Continuation()).toEqual(data);
},300000);
