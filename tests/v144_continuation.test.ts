import {expect,it} from 'vitest';
import expected from './v144_continuation.expected.json';
import {v144Continuation} from './helpers/v144ref';
it('preserves the recorded ordinary and staged rules-144 final account continuation',()=>{const {source,...recorded}=expected;expect(source.rules).toBe(144);expect(v144Continuation()).toEqual(recorded);});
