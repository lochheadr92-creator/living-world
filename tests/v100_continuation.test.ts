import {expect,it} from 'vitest';
import expected from './v100_continuation.expected.json';
import {v100Continuation} from './helpers/v100ref';
it('preserves rules-100 ordinary, told, deferred, stale and complementary continuations exactly',()=>{
 const {source,...recorded}=expected;expect(source).toContain('rules 100');expect(v100Continuation()).toEqual(recorded);
});
