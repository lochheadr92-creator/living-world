import {expect,it} from 'vitest';
import expected from './v133_continuation.expected.json';
import {v133Continuation} from './helpers/v133ref';
it('preserves recorded rules-133 ordinary and paid nourishment continuations',{timeout:300000},()=>{
 const {source,...recorded}=expected;expect(source.rules).toBe(133);expect(v133Continuation()).toEqual(recorded);
});
