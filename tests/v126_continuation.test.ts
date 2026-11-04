import {expect,it} from 'vitest';
import expected from './v126_continuation.expected.json';
import {v126Continuation} from './helpers/v126ref';
it('preserves recorded rules-126 ordinary and paid gear manufacture/placement/waiting continuations',{timeout:300000},()=>{
 const {source,...recorded}=expected;expect(source.rules).toBe(126);expect(v126Continuation()).toEqual(recorded);
});
