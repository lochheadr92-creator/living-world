import {expect,it} from 'vitest';
import expected from './v84_continuation.expected.json';
import {v84Continuation} from './helpers/v84ref';
it('preserves rules-84 ordinary reconciliation, private withdrawal and heard cancellation continuations exactly',()=>{
 const {source,...recorded}=expected;expect(v84Continuation()).toEqual(recorded);
},120000);
