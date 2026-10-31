import {expect,it} from 'vitest';
import expected from './v103_continuation.expected.json';
import {v103Continuation} from './helpers/v103ref';
it('preserves rules-103 ordinary and staged ledger continuations exactly',()=>{
 const {source,...recorded}=expected;expect(source).toContain('rules 103');expect(v103Continuation()).toEqual(recorded);
});
