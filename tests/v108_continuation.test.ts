import {expect,it} from 'vitest';
import expected from './v108_continuation.expected.json';
import {v108Continuation} from './helpers/v108ref';
it('preserves rules-108 ordinary, unseen/seen home loss and interrupted construction exactly',()=>{
 const {source,...recorded}=expected;expect(source).toContain('rules 108 before successor behaviour');expect(v108Continuation()).toEqual(recorded);
});
