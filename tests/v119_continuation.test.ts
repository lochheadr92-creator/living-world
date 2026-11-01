import {expect,it} from 'vitest';
import expected from './v119_continuation.expected.json';
import {v119Continuation} from './helpers/v119ref';
it('preserves rules-119 childhood experiences through an exact saved continuation',{timeout:300000},()=>{
 const {source,...recorded}=expected;expect(source).toContain('rules 119 before successor behaviour');expect(v119Continuation()).toEqual(recorded);
});
