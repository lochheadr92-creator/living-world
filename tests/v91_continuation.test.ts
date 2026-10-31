import {expect,it} from 'vitest';
import expected from './v91_continuation.expected.json';
import {v91Continuation} from './helpers/v91ref';
it('preserves rules-91 ordinary, private waiting, heard cancellation, replacement and shared food continuations exactly',()=>{
 const {source,...recorded}=expected;expect(v91Continuation()).toEqual(recorded);
},120000);
