import {expect,it} from 'vitest';
import expected from './v142_continuation.expected.json';
import {v142Continuation} from './helpers/v142ref';
it('preserves the recorded ordinary and staged rules-142 skill lesson continuation',()=>{const {source,...recorded}=expected;expect(source.rules).toBe(142);expect(v142Continuation()).toEqual(recorded);});
