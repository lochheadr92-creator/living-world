import {expect,it} from 'vitest';
import expected from './v247_continuation.expected.json';
import {v247Continuation} from './helpers/v247ref';
it('preserves the rules-247 ordinary gen-2 continuation',()=>{
 const {source,...data}=expected;expect(v247Continuation()).toEqual(data);
},245000);
