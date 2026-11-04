import {expect,it} from 'vitest';
import expected from './v145_continuation.expected.json';
import {v145Continuation} from './helpers/v145ref';
it('preserves the recorded ordinary and staged rules-145 final account continuation',()=>{const {source,...recorded}=expected;expect(source.rules).toBe(145);expect(v145Continuation()).toEqual(recorded);});
