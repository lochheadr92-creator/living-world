import {expect,it} from 'vitest';
import expected from './v82_continuation.expected.json';
import {v82Continuation} from './helpers/v82ref';
it('preserves rules-82 ordinary heard agreements, remote death and late report continuations exactly',()=>{
 const {source,...recorded}=expected;expect(v82Continuation()).toEqual(recorded);
},120000);
