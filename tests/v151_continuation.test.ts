import {expect,it} from 'vitest';
import expected from './v151_continuation.expected.json';
import {v151Continuation} from './helpers/v151ref';
it('preserves rules-151 ordinary and autonomous lamb-birth continuations',()=>{
 const {source,...data}=expected;expect(v151Continuation()).toEqual(data);
},120000);
