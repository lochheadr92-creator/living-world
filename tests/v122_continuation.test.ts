import {expect,it} from 'vitest';
import expected from './v122_continuation.expected.json';
import {v122Continuation} from './helpers/v122ref';
it('preserves recorded rules-122 ordinary and paid preservation continuations',{timeout:300000},()=>{
  const {source,...recorded}=expected;
  expect(source.rules).toBe(122);
  expect(v122Continuation()).toEqual(recorded);
});
