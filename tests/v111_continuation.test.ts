import {expect,it} from 'vitest';
import expected from './v111_continuation.expected.json';
import {v111Continuation} from './helpers/v111ref';
it('preserves rules-111 ordinary, ongoing occasion and urgent interruption exactly',()=>{
 const {source,...recorded}=expected;expect(source).toContain('rules 111 before successor behaviour');expect(v111Continuation()).toEqual(recorded);
});
