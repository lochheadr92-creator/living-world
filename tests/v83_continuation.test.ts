import {expect,it} from 'vitest';
import expected from './v83_continuation.expected.json';
import {v83Continuation} from './helpers/v83ref';
it('preserves rules-83 ordinary cancellation, discovered target and late report continuations exactly',()=>{
 const {source,...recorded}=expected;expect(v83Continuation()).toEqual(recorded);
},120000);
