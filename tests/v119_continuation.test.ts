import {expect,it} from 'vitest';
import expected from './v119_continuation.expected.json';
import {v119Continuation} from './helpers/v119ref';
it('preserves the recorded rules-119 Pavel lived-life company and shelter continuation',{timeout:300000},()=>{
 const {source,...recorded}=expected;expect(source).toContain('rules 119 recorded at the Pavel/Talia integration');expect(v119Continuation()).toEqual(recorded);
});