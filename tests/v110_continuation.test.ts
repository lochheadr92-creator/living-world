import {expect,it} from 'vitest';
import expected from './v110_continuation.expected.json';
import {v110Continuation} from './helpers/v110ref';
it('preserves rules-110 ordinary, water search and real drinking exactly',()=>{
 const {source,...recorded}=expected;expect(source).toContain('rules 110 before successor behaviour');expect(v110Continuation()).toEqual(recorded);
});
