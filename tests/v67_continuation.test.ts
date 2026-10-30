import {expect,it} from 'vitest';
import expected from './v67_continuation.expected.json';
import {v67Continuation} from './helpers/v67ref';
it('preserves rules-67 ordinary, stored drinking, empty stock, return and blocked entrance continuations',()=>{
 const {source,...reference}=expected;expect(v67Continuation()).toEqual(reference);
},120000);
