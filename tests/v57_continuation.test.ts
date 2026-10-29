import {expect,it} from 'vitest';
import reference from './v57_continuation.expected.json';
import {v57Continuation} from './helpers/v57ref';
it('preserves rules 57 ordinary and active tool crafting continuations before rules 58',()=>{
 const {source,...expected}=reference;expect(v57Continuation()).toEqual(expected);
},130000);
