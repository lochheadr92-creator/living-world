import {expect,it} from 'vitest';
import expected from './v186_continuation.expected.json';
import {v186Continuation} from './helpers/v186ref';
it('preserves the rules-186 ordinary cedar continuation',()=>{
 const {source,...data}=expected;expect(v186Continuation()).toEqual(data);
},120000);
