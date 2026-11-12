import {expect,it} from 'vitest';
import expected from './v226_continuation.expected.json';
import {v226Continuation} from './helpers/v226ref';
it('preserves the rules-226 ordinary aspen continuation',()=>{
 const {source,...data}=expected;expect(v226Continuation()).toEqual(data);
},120000);
