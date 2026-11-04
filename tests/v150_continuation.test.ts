import {expect,it} from 'vitest';
import expected from './v150_continuation.expected.json';
import {v150Continuation} from './helpers/v150ref';
it('preserves rules-150 ordinary and autonomous trap-meat continuations',()=>{
 const {source,...data}=expected;expect(v150Continuation()).toEqual(data);
},120000);
