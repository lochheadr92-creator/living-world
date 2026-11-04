import {expect,it} from 'vitest';
import expected from './v129_continuation.expected.json';
import {v129Continuation} from './helpers/v129ref';
it('preserves recorded rules-129 ordinary sheep and paid capture, shearing and slaughter continuations',{timeout:300000},()=>{
 const {source,...recorded}=expected;expect(source.rules).toBe(129);expect(v129Continuation()).toEqual(recorded);
});
