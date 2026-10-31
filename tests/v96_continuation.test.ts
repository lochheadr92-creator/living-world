import {expect,it} from 'vitest';
import expected from './v96_continuation.expected.json';
import {v96Continuation} from './helpers/v96ref';
it('preserves rules-96 ordinary, heard fire, paid acquisition and personally observed target loss exactly',()=>{
 const {source,...recorded}=expected;expect(source).toContain('rules 96');expect(v96Continuation()).toEqual(recorded);
});
