import {expect,it} from 'vitest';
import expected from './v65_continuation.expected.json';
import {v65Continuation} from './helpers/v65ref';
it('preserves rules-65 ordinary, source, stock, water and outside-resident continuations',()=>{
 const {source,...reference}=expected;expect(v65Continuation()).toEqual(reference);
},120000);
