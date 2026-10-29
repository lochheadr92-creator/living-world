import {expect,it} from 'vitest';
import reference from './v58_continuation.expected.json';
import {v58Continuation} from './helpers/v58ref';
it('preserves rules 58 ordinary and seed storage continuations before rules 59',()=>{
 const {source,...expected}=reference;expect(v58Continuation()).toEqual(expected);
},130000);
