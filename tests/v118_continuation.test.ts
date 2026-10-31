import {expect,it} from 'vitest';
import expected from './v118_continuation.expected.json';
import {v118Continuation} from './helpers/v118ref';
it('preserves the recorded rules-118 critical search during cooldown',()=>{
 const {source,...reference}=expected;expect(v118Continuation()).toEqual(reference);
});
