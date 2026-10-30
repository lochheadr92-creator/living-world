import {expect,it} from 'vitest';
import expected from './v61_continuation.expected.json';
import {v61Continuation} from './helpers/v61ref';
it('preserves rules-61 ordinary, tool-loss and indoor-care saved continuations',()=>{
 const {source,...reference}=expected;expect(v61Continuation()).toEqual(reference);
},120000);
