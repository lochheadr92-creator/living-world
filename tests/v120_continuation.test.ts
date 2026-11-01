import {expect,it} from 'vitest';
import expected from './v120_continuation.expected.json';
import {v120Continuation} from './helpers/v120ref';
it('preserves the recorded rules-120 Talia childhood continuation',{timeout:300000},()=>{
 const {source,...recorded}=expected;expect(source).toContain('rules 120 recorded at the Pavel/Talia integration');expect(v120Continuation()).toEqual(recorded);
});