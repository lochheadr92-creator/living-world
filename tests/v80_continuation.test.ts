import {expect,it} from 'vitest';
import expected from './v80_continuation.expected.json';
import {v80Continuation} from './helpers/v80ref';
it('preserves rules-80 ordinary reporting and private completion continuations exactly',()=>{
 const {source,...recorded}=expected;expect(v80Continuation()).toEqual(recorded);
},120000);
