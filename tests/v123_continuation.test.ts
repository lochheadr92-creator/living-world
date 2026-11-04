import {expect,it} from 'vitest';
import expected from './v123_continuation.expected.json';
import {v123Continuation} from './helpers/v123ref';
it('preserves recorded rules-123 ordinary and paid hearth continuations',{timeout:300000},()=>{
  const {source,...recorded}=expected;expect(source.rules).toBe(123);expect(v123Continuation()).toEqual(recorded);
});
