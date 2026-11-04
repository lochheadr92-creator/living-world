import {expect,it} from 'vitest';
import expected from './v135_continuation.expected.json';
import {v135Continuation} from './helpers/v135ref';
it('preserves the recorded autonomous rules-135 cellar continuation',()=>{const {source,...recorded}=expected;expect(source.rules).toBe(135);expect(v135Continuation()).toEqual(recorded);});
