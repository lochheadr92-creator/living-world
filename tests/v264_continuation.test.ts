import {expect,it} from 'vitest';
import expected from './v264_continuation.expected.json';
import {v264Continuation,V264_TICK} from './helpers/v264ref';
it('preserves the rules-264 ordinary gen-2 continuation',()=>{
 const {source,...data}=expected;expect(v264Continuation(V264_TICK)).toEqual(data);
},360000);
