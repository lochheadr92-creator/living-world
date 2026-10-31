import {expect,it} from 'vitest';
import expected from './v116_continuation.expected.json';
import {v116Continuation} from './helpers/v116ref';
it('preserves the rules-116 ordinary continuation through paused-activity endings exactly',{timeout:300000},()=>{
 const {source,...recorded}=expected;expect(source).toContain('rules 116 before successor behaviour');expect(v116Continuation()).toEqual(recorded);
});
