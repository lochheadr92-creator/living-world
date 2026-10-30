import {expect,it} from 'vitest';
import expected from './v78_continuation.expected.json';
import {v78Continuation} from './helpers/v78ref';
it('preserves rules-78 ordinary and task-specific helper continuations exactly',async()=>{
 const {source,...recorded}=expected;expect(await v78Continuation()).toEqual(recorded);
},120000);
