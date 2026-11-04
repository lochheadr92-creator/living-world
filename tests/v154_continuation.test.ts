import {expect,it} from 'vitest';
import expected from './v154_continuation.expected.json';
import {v154Continuation} from './helpers/v154ref';
it('preserves the rules-154 ordinary river continuation',()=>{
 const {source,...data}=expected;expect(v154Continuation()).toEqual(data);
},180000);
