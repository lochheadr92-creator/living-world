import {expect,it} from 'vitest';
import expected from './v64_continuation.expected.json';
import {v64Continuation} from './helpers/v64ref';
it('preserves rules-64 ordinary, care, competing tools and actual travelling-source continuations',()=>{
 const {source,...reference}=expected;expect(v64Continuation()).toEqual(reference);
},120000);
