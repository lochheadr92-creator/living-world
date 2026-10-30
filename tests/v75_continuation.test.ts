import {expect,it} from 'vitest';
import expected from './v75_continuation.expected.json';
import {v75Continuation} from './helpers/v75ref';
it('preserves rules-75 ordinary and failed-contact continuations exactly',()=>{
 const {source,...recorded}=expected;expect(v75Continuation()).toEqual(recorded);
},120000);
