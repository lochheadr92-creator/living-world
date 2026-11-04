import {expect,it} from 'vitest';
import expected from './v137_continuation.expected.json';
import {v137Continuation} from './helpers/v137ref';
it('preserves the recorded autonomous rules-137 planted-tree continuation',()=>{const {source,...recorded}=expected;expect(source.rules).toBe(137);expect(v137Continuation()).toEqual(recorded);});
