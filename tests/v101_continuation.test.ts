import {expect,it} from 'vitest';
import expected from './v101_continuation.expected.json';
import {v101Continuation} from './helpers/v101ref';
it('preserves rules-101 ordinary, covered, delivered and expired promise continuations exactly',()=>{
 const {source,...recorded}=expected;expect(source).toContain('rules 101');expect(v101Continuation()).toEqual(recorded);
});
