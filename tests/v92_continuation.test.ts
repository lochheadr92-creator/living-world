import {expect,it} from 'vitest';
import expected from './v92_continuation.expected.json';
import {v92Continuation} from './helpers/v92ref';
it('preserves rules-92 ordinary, actual heard work, informed succession and private-work continuations exactly',()=>{
 const {source,...recorded}=expected;expect(v92Continuation()).toEqual(recorded);
},120000);
