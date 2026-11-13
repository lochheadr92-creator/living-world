import {expect,it} from 'vitest';
import expected from './v243_continuation.expected.json';
import {v243Continuation} from './helpers/v243ref';
it('preserves the rules-243 ordinary aspen continuation',()=>{
 const {source,...data}=expected;expect(v243Continuation()).toEqual(data);
},243000);
