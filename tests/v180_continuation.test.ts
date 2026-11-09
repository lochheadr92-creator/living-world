import {expect,it} from 'vitest';
import expected from './v180_continuation.expected.json';
import {v180Continuation} from './helpers/v180ref';
it('preserves the rules-180 ordinary river continuation',()=>{
 const {source,...data}=expected;expect(v180Continuation()).toEqual(data);
},120000);
