import {expect,it} from 'vitest';
import expected from './v79_continuation.expected.json';
import {v79Continuation} from './helpers/v79ref';
it('preserves rules-79 ordinary and witnessed childcare continuations exactly',()=>{
 const {source,...recorded}=expected;expect(v79Continuation()).toEqual(recorded);
},120000);
