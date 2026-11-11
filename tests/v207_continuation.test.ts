import {expect,it} from 'vitest';
import expected from './v207_continuation.expected.json';
import {v207Continuation} from './helpers/v207ref';
it('preserves the rules-207 ordinary gen-2 continuation',()=>{
 const {source,...data}=expected;expect(v207Continuation()).toEqual(data);
},600000);
