import {expect,it} from 'vitest';
import expected from './v190_continuation.expected.json';
import {v190Continuation} from './helpers/v190ref';
it('preserves the rules-190 ordinary birch continuation',()=>{
 const {source,...data}=expected;expect(v190Continuation()).toEqual(data);
},600000);
