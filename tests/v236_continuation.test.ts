import {expect,it} from 'vitest';
import expected from './v236_continuation.expected.json';
import {v236Continuation} from './helpers/v236ref';
it('preserves the rules-236 ordinary river continuation',()=>{
 const {source,...data}=expected;expect(v236Continuation()).toEqual(data);
},240000);
