import {expect,it} from 'vitest';
import expected from './v248_continuation.expected.json';
import {v248Continuation} from './helpers/v248ref';
it('preserves the rules-248 ordinary gen-2 continuation',()=>{
 const {source,...data}=expected;expect(v248Continuation()).toEqual(data);
},245000);
