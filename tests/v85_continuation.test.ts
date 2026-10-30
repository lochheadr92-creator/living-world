import {expect,it} from 'vitest';
import expected from './v85_continuation.expected.json';
import {v85Continuation} from './helpers/v85ref';
it('preserves rules-85 completed building shares and heard-before-answer negotiation continuations exactly',()=>{
 const {source,...recorded}=expected;expect(v85Continuation()).toEqual(recorded);
},120000);
