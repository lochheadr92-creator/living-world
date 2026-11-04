import {expect,it} from 'vitest';
import expected from './v134_continuation.expected.json';
import {v134Continuation} from './helpers/v134ref';
it('preserves the recorded autonomous rules-134 well continuation',()=>{const {source,...recorded}=expected;expect(source.rules).toBe(134);expect(v134Continuation()).toEqual(recorded);});
