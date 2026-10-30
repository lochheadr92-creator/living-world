import {expect,it} from 'vitest';
import expected from './v68_continuation.expected.json';
import {v68Continuation} from './helpers/v68ref';
it('preserves rules-68 ordinary, water provision, full store, mixed supply and suspended return continuations',()=>{
 const {source,...reference}=expected;expect(v68Continuation()).toEqual(reference);
},120000);
