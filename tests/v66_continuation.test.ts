import {expect,it} from 'vitest';
import expected from './v66_continuation.expected.json';
import {v66Continuation} from './helpers/v66ref';
it('preserves rules-66 ordinary, resident travel, hand-over, full water pack and unseen death continuations',()=>{
 const {source,...reference}=expected;expect(v66Continuation()).toEqual(reference);
},120000);
