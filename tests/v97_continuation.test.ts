import {expect,it} from 'vitest';
import expected from './v97_continuation.expected.json';
import {v97Continuation} from './helpers/v97ref';
it('preserves rules-97 ordinary, proposed and answered care return, resumed watch and competing conversation exactly',()=>{
 const {source,...recorded}=expected;expect(source).toContain('rules 97');expect(v97Continuation()).toEqual(recorded);
});
