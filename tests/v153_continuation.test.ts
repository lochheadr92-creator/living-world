import {expect,it} from 'vitest';
import expected from './v153_continuation.expected.json';
import {v153Continuation} from './helpers/v153ref';
it('preserves the rules-153 ordinary river continuation',()=>{
 const {source,...data}=expected;expect(v153Continuation()).toEqual(data);
},180000);
