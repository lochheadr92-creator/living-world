import {expect,it} from 'vitest';
import expected from './v117_continuation.expected.json';
import {v117Continuation} from './helpers/v117ref';
it('preserves rules-117 ordinary company and shelter through an exact saved continuation',{timeout:300000},()=>{
 const {source,...recorded}=expected;expect(source).toContain('rules 117 before successor behaviour');expect(v117Continuation()).toEqual(recorded);
});
