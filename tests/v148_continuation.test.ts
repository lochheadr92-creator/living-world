import {expect,it} from 'vitest';
import expected from './v148_continuation.expected.json';
import {v148Continuation} from './helpers/v148ref';
it('preserves rules-148 ordinary and paid sibling-plan crafting continuations',()=>{
 const {source,...data}=expected;expect(v148Continuation()).toEqual(data);
},120000);
