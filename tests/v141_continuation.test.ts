import {expect,it} from 'vitest';
import expected from './v141_continuation.expected.json';
import {v141Continuation} from './helpers/v141ref';
it('preserves the recorded ordinary and staged rules-141 grave visit continuation',()=>{const {source,...recorded}=expected;expect(source.rules).toBe(141);expect(v141Continuation()).toEqual(recorded);});
