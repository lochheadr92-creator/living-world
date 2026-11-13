import {expect,it} from 'vitest';
import expected from './v237_continuation.expected.json';
import {v237Continuation} from './helpers/v237ref';
it('preserves the rules-237 ordinary continuation',()=>{
 const {source,...data}=expected;expect(v237Continuation()).toEqual(data);
},240000);
