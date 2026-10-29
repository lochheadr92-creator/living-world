import {expect,it} from 'vitest';
import reference from './v56_continuation.expected.json';
import {v56Continuation} from './helpers/v56ref';
it('preserves rules 56 ordinary and childcare full saved-state continuations before rules 57',()=>{
 const {source,...expected}=reference;
 expect(v56Continuation()).toEqual(expected);
},130000);
