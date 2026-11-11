import {expect,it} from 'vitest';
import expected from './v201_continuation.expected.json';
import {v201Continuation} from './helpers/v201ref';
it('preserves the rules-201 ordinary gen-2 continuation',()=>{
 const {source,...data}=expected;expect(v201Continuation()).toEqual(data);
},120000);
