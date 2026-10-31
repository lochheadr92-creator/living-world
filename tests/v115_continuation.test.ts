import {expect,it} from 'vitest';
import expected from './v115_continuation.expected.json';
import {v115Continuation} from './helpers/v115ref';
it('preserves rules-115 ordinary and accepted project-handcraft/input-release continuations exactly',()=>{
 const {source,...recorded}=expected;expect(source).toContain('rules 115 before successor behaviour');expect(v115Continuation()).toEqual(recorded);
});
