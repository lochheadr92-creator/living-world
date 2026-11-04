import {expect,it} from 'vitest';
import expected from './v146_continuation.expected.json';
import {v146Continuation} from './helpers/v146ref';
it('preserves the recorded ordinary and staged rules-146 final account continuation',()=>{const {source,...recorded}=expected;expect(source.rules).toBe(146);expect(v146Continuation()).toEqual(recorded);});
