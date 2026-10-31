import {expect,it} from 'vitest';
import expected from './v95_continuation.expected.json';
import {v95Continuation} from './helpers/v95ref';
it('preserves rules-95 ordinary, paid care acquisition, receipt and informed cancellation exactly',()=>{
 const {source,...recorded}=expected;expect(v95Continuation()).toEqual(recorded);
},120000);
