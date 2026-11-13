import {expect,it} from 'vitest';
import expected from './v239_continuation.expected.json';
import {v239Continuation} from './helpers/v239ref';
it('preserves the rules-239 ordinary birch continuation',()=>{
 const {source,...data}=expected;expect(v239Continuation()).toEqual(data);
},240000);
