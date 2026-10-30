import {expect,it} from 'vitest';
import expected from './v69_continuation.expected.json';
import {v69Continuation} from './helpers/v69ref';
it('preserves rules-69 ordinary and production continuations exactly',()=>{
 const {source,...recorded}=expected;expect(v69Continuation()).toEqual(recorded);
},120000);
