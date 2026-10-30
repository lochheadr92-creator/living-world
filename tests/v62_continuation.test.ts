import {expect,it} from 'vitest';
import expected from './v62_continuation.expected.json';
import {v62Continuation} from './helpers/v62ref';
it('preserves rules-62 ordinary, indoor hand-over and full-pack continuations',()=>{
 const {source,...reference}=expected;expect(v62Continuation()).toEqual(reference);
},120000);
