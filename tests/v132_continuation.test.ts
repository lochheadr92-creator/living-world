import {expect,it} from 'vitest';
import expected from './v132_continuation.expected.json';
import {v132Continuation} from './helpers/v132ref';
it('preserves recorded rules-132 ordinary and paid nourishment continuations',{timeout:300000},()=>{
 const {source,...recorded}=expected;expect(source.rules).toBe(132);expect(v132Continuation()).toEqual(recorded);
});
