import {expect,it} from 'vitest';
import expected from './v241_continuation.expected.json';
import {v241Continuation} from './helpers/v241ref';
it('preserves the rules-241 ordinary fern continuation',()=>{
 const {source,...data}=expected;expect(v241Continuation()).toEqual(data);
},241000);
