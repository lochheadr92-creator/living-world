import {expect,it} from 'vitest';
import expected from './v149_continuation.expected.json';
import {v149Continuation} from './helpers/v149ref';
it('preserves rules-149 ordinary and paid preservation collection continuations',()=>{
 const {source,...data}=expected;expect(v149Continuation()).toEqual(data);
},120000);
