import {expect,it} from 'vitest';
import reference from './v59_continuation.expected.json';
import {v59Continuation} from './helpers/v59ref';
it('preserves rules 59 ordinary river and meadow continuations before rules 60',()=>{
 const {source,...expected}=reference;expect(v59Continuation()).toEqual(expected);
},130000);
