import {expect,it} from 'vitest';
import expected from './v138_continuation.expected.json';
import {v138Continuation} from './helpers/v138ref';
it('preserves the recorded rules-138 ordinary and staged workshop continuation',()=>{const {source,...recorded}=expected;expect(source.rules).toBe(138);expect(v138Continuation()).toEqual(recorded);});
