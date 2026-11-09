import {expect,it} from 'vitest';
import expected from './v177_continuation.expected.json';
import {v177Continuation} from './helpers/v177ref';
it('preserves the rules-177 ordinary birch continuation',()=>{
 const {source,...data}=expected;expect(v177Continuation()).toEqual(data);
},120000);
