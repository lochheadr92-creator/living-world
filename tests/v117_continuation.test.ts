import {expect,it} from 'vitest';
import expected from './v117_continuation.expected.json';
import {v117Continuation} from './helpers/v117ref';
it('preserves the recorded rules-117 project acquisition and paid hammer',()=>{
 const {source,...reference}=expected;expect(v117Continuation()).toEqual(reference);
});
