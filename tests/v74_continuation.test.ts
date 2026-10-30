import {expect,it} from 'vitest';
import expected from './v74_continuation.expected.json';
import {v74Continuation} from './helpers/v74ref';
it('preserves rules-74 ordinary and source-experience continuations exactly',()=>{
 const {source,...recorded}=expected;expect(v74Continuation()).toEqual(recorded);
},120000);
