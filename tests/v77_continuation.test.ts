import {expect,it} from 'vitest';
import expected from './v77_continuation.expected.json';
import {v77Continuation} from './helpers/v77ref';
it('preserves rules-77 ordinary, corrected route and helper-receipt continuations exactly',async()=>{
 const {source,...recorded}=expected;expect(await v77Continuation()).toEqual(recorded);
},120000);
