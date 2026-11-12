import {expect,it} from 'vitest';
import expected from './v220_continuation.expected.json';
import {v220Continuation} from './helpers/v220ref';
it('preserves the rules-220 ordinary aspen continuation',()=>{
 const {source,...data}=expected;expect(v220Continuation()).toEqual(data);
},120000);
