import {expect,it} from 'vitest';
import expected from './v71_continuation.expected.json';
import {v71Continuation} from './helpers/v71ref';
it('preserves rules-71 ordinary and scoped-work continuations exactly',()=>{
 const {source,...recorded}=expected;expect(v71Continuation()).toEqual(recorded);
},120000);
