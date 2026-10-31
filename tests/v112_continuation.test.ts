import {expect,it} from 'vitest';
import expected from './v112_continuation.expected.json';
import {v112Continuation} from './helpers/v112ref';
it('preserves rules-112 ordinary, paused and resumed occasion and closed refusal exactly',()=>{
 const {source,...recorded}=expected;expect(source).toContain('rules 112 before successor behaviour');expect(v112Continuation()).toEqual(recorded);
});
