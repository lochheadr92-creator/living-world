import {expect,it} from 'vitest';
import expected from './v140_continuation.expected.json';
import {v140Continuation} from './helpers/v140ref';
it('preserves the recorded autonomous rules-140 crafted-rod continuation',()=>{const {source,...recorded}=expected;expect(source.rules).toBe(140);expect(v140Continuation()).toEqual(recorded);});
