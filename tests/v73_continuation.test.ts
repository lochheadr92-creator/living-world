import {expect,it} from 'vitest';
import expected from './v73_continuation.expected.json';
import {v73Continuation} from './helpers/v73ref';
it('preserves rules-73 ordinary and source-recovery continuations exactly',()=>{
 const {source,...recorded}=expected;expect(v73Continuation()).toEqual(recorded);
},120000);
