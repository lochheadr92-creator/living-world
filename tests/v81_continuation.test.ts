import {expect,it} from 'vitest';
import expected from './v81_continuation.expected.json';
import {v81Continuation} from './helpers/v81ref';
it('preserves rules-81 ordinary partial outcomes and private failure continuations exactly',()=>{
 const {source,...recorded}=expected;expect(v81Continuation()).toEqual(recorded);
},120000);
