import {expect,it} from 'vitest';
import expected from './v72_continuation.expected.json';
import {v72Continuation} from './helpers/v72ref';
it('preserves rules-72 ordinary, provisioning, need-break, travel and lost-source continuations exactly',()=>{
 const {source,...recorded}=expected;expect(v72Continuation()).toEqual(recorded);
},120000);
