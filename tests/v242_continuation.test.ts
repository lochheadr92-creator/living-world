import {expect,it} from 'vitest';
import expected from './v242_continuation.expected.json';
import {v242Continuation} from './helpers/v242ref';
it('preserves the rules-242 ordinary aspen continuation',()=>{
 const {source,...data}=expected;expect(v242Continuation()).toEqual(data);
},242000);
