import {expect,it} from 'vitest';
import expected from './v88_continuation.expected.json';
import {v88Continuation} from './helpers/v88ref';
it('preserves rules-88 ordinary, flood discovery, physical retreat and waiting recovery continuations exactly',()=>{
  const {source,...recorded}=expected;
  expect(v88Continuation()).toEqual(recorded);
},120000);
