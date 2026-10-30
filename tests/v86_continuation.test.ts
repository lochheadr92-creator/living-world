import {expect,it} from 'vitest';
import expected from './v86_continuation.expected.json';
import {v86Continuation} from './helpers/v86ref';
it('preserves rules-86 ordinary ecology, actual sowing, partial field rest and recovery continuations exactly',()=>{
  const {source,...recorded}=expected;
  expect(v86Continuation()).toEqual(recorded);
},120000);
