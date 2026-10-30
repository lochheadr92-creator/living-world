import { expect,it } from 'vitest';
import expected from './v60_continuation.expected.json';
import { v60Continuation } from './helpers/v60ref';
it('preserves rules-60 ordinary and active required-tool-loss full saved continuations',()=>{
  const {source,...reference}=expected;
  expect(v60Continuation()).toEqual(reference);
},120000);
