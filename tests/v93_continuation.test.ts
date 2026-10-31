import {expect,it} from 'vitest';
import expected from './v93_continuation.expected.json';
import {v93Continuation} from './helpers/v93ref';
it('preserves rules-93 ordinary, owned parcels, paid collection and recovered-tool use exactly',()=>{
 const {source,...recorded}=expected;expect(v93Continuation()).toEqual(recorded);
},120000);
