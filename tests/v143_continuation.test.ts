import {expect,it} from 'vitest';
import expected from './v143_continuation.expected.json';
import {v143Continuation} from './helpers/v143ref';
it('preserves the recorded ordinary and staged rules-143 shared project continuation',()=>{const {source,...recorded}=expected;expect(source.rules).toBe(143);expect(v143Continuation()).toEqual(recorded);});
