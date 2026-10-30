import {expect,it} from 'vitest';
import expected from './v70_continuation.expected.json';
import {v70Continuation} from './helpers/v70ref';
it('preserves rules-70 ordinary and learned-preference continuations exactly',()=>{
 const {source,...recorded}=expected;expect(v70Continuation()).toEqual(recorded);
},120000);
