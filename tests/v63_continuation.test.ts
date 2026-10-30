import {expect,it} from 'vitest';
import expected from './v63_continuation.expected.json';
import {v63Continuation} from './helpers/v63ref';
it('preserves rules-63 ordinary, care capacity recovery and competing-tool continuations',()=>{
 const {source,...reference}=expected;expect(v63Continuation()).toEqual(reference);
},120000);
