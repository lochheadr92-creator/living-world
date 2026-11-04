import {expect,it} from 'vitest';
import expected from './v139_continuation.expected.json';
import {v139Continuation} from './helpers/v139ref';
it('preserves the recorded rules-139 ordinary and staged brewing continuation',()=>{const {source,...recorded}=expected;expect(source.rules).toBe(139);expect(v139Continuation()).toEqual(recorded);});
