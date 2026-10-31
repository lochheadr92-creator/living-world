import {expect,it} from 'vitest';
import expected from './v102_continuation.expected.json';
import {v102Continuation} from './helpers/v102ref';
it('preserves rules-102 ordinary, declined-second-ask and single-patch continuations exactly',()=>{
 const {source,...recorded}=expected;expect(source).toContain('rules 102');expect(v102Continuation()).toEqual(recorded);
});
