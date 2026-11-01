import {expect,it} from 'vitest';
import expected from './v121_continuation.expected.json';
import {v121Continuation} from './helpers/v121ref';
it('preserves the recorded rules-121 resumed gathering credit continuation',{timeout:300000},()=>{
 const {source,...recorded}=expected;expect(source).toContain('rules 121 recorded at the Pavel/Talia integration');expect(v121Continuation()).toEqual(recorded);
});