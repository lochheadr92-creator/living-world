import {expect,it} from 'vitest';
import expected from './v76_continuation.expected.json';
import {v76Continuation} from './helpers/v76ref';
it('preserves rules-76 ordinary and personal-route continuations exactly',()=>{
 const {source,...recorded}=expected;expect(v76Continuation()).toEqual(recorded);
},120000);
