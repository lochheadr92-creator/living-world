import {expect,it} from 'vitest';
import expected from './v147_continuation.expected.json';
import {v147Continuation} from './helpers/v147ref';
it('preserves the recorded ordinary and staged rules-147 final account continuation',()=>{const {source,...recorded}=expected;expect(source.rules).toBe(147);expect(v147Continuation()).toEqual(recorded);});
