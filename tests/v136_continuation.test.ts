import {expect,it} from 'vitest';
import expected from './v136_continuation.expected.json';
import {v136Continuation} from './helpers/v136ref';
it('preserves the recorded rules-136 ordinary and staged stock continuation',()=>{const {source,...recorded}=expected;expect(source.rules).toBe(136);expect(v136Continuation()).toEqual(recorded);});
