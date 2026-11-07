import {expect,it} from 'vitest';
import expected from './v165_continuation.expected.json';
import {v165Continuation} from './helpers/v165ref';
it('preserves the rules-165 ordinary gen-6 continuation',()=>{
 const {source,...data}=expected;expect(v165Continuation()).toEqual(data);
},240000);
