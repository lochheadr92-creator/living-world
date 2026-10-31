import {expect,it} from 'vitest';
import expected from './v114_continuation.expected.json';
import {v114Continuation} from './helpers/v114ref';
it('preserves rules-114 ordinary and accepted hungry-harvest/eating continuations exactly',()=>{
 const {source,...recorded}=expected;expect(source).toContain('rules 114 before successor behaviour');expect(v114Continuation()).toEqual(recorded);
});
