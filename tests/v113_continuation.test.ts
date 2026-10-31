import {expect,it} from 'vitest';
import expected from './v113_continuation.expected.json';
import {v113Continuation} from './helpers/v113ref';
it('preserves rules-113 ordinary and paid/unpaid grain-to-seed boundaries exactly',()=>{
 const {source,...recorded}=expected;expect(source).toContain('rules 113 before successor behaviour');expect(v113Continuation()).toEqual(recorded);
});
