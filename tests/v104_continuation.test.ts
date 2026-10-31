import {expect,it} from 'vitest';
import expected from './v104_continuation.expected.json';
import {v104Continuation} from './helpers/v104ref';
it('preserves rules-104 ordinary and told-at-supper continuations exactly',()=>{
 const {source,...recorded}=expected;expect(source).toContain('rules 104');expect(v104Continuation()).toEqual(recorded);
});
