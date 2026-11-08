import {expect,it} from 'vitest';
import expected from './v172_continuation.expected.json';
import {v172Continuation} from './helpers/v172ref';
it('preserves the rules-172 ordinary aspen continuation',()=>{
 const {source,...data}=expected;expect(v172Continuation()).toEqual(data);
},180000);
