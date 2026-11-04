import {expect,it} from 'vitest';
import expected from './v124_continuation.expected.json';
import {v124Continuation} from './helpers/v124ref';
it('preserves recorded rules-124 ordinary and paid textile continuations',{timeout:300000},()=>{
 const {source,...recorded}=expected;expect(source.rules).toBe(124);expect(v124Continuation()).toEqual(recorded);
});
