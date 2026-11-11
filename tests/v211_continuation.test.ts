import {expect,it} from 'vitest';
import expected from './v211_continuation.expected.json';
import {v211Continuation} from './helpers/v211ref';
it('preserves the rules-211 ordinary gen-2 continuation',()=>{
 const {source,...data}=expected;expect(v211Continuation()).toEqual(data);
},120000);
