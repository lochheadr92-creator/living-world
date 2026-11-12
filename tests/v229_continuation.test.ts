import {expect,it} from 'vitest';
import expected from './v229_continuation.expected.json';
import {v229Continuation} from './helpers/v229ref';
it('preserves the rules-229 ordinary forest continuation',()=>{
 const {source,...data}=expected;expect(v229Continuation()).toEqual(data);
},240000);
