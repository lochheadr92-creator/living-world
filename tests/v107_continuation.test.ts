import {expect,it} from 'vitest';
import expected from './v107_continuation.expected.json';
import {v107Continuation} from './helpers/v107ref';
it('preserves rules-107 ordinary, told, asked and retold continuations exactly',()=>{
 const {source,...recorded}=expected;expect(source).toContain('rules 107');expect(v107Continuation()).toEqual(recorded);
});
