import {expect,it} from 'vitest';
import expected from './v227_continuation.expected.json';
import {v227Continuation} from './helpers/v227ref';
it('preserves the rules-227 ordinary aspen continuation',()=>{
 const {source,...data}=expected;expect(v227Continuation()).toEqual(data);
},120000);
