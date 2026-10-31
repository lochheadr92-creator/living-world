import {expect,it} from 'vitest';
import expected from './v89_continuation.expected.json';
import {v89Continuation} from './helpers/v89ref';
it('preserves rules-89 ordinary, paid offcut production, collection and partial fuel continuations exactly',()=>{
 const {source,...recorded}=expected;expect(v89Continuation()).toEqual(recorded);
},120000);
