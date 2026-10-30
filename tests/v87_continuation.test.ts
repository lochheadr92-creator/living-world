import {expect,it} from 'vitest';
import expected from './v87_continuation.expected.json';
import {v87Continuation} from './helpers/v87ref';
it('preserves rules-87 ordinary sipping, physical depletion, changed access and rain continuations exactly',()=>{
  const {source,...recorded}=expected;
  expect(v87Continuation()).toEqual(recorded);
},120000);
