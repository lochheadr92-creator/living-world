import {expect,it} from 'vitest';
import expected from './v127_continuation.expected.json';
import {v127Continuation} from './helpers/v127ref';
it('preserves recorded rules-127 ordinary and paid gear manufacture/placement/waiting continuations',{timeout:300000},()=>{
 const {source,...recorded}=expected;expect(source.rules).toBe(127);expect(v127Continuation()).toEqual(recorded);
});
