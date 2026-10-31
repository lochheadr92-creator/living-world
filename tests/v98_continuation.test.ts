import {expect,it} from 'vitest';
import expected from './v98_continuation.expected.json';
import {v98Continuation} from './helpers/v98ref';
it('preserves rules-98 ordinary, heard, fulfilled, sheltered, paid and interrupted roof-duty continuations exactly',()=>{
 const {source,...recorded}=expected;expect(source).toContain('rules 98');expect(v98Continuation()).toEqual(recorded);
});
