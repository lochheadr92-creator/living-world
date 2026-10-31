import {expect,it} from 'vitest';
import expected from './protocol31_32_revision_predecessor.json';
import {deserializeWorld} from '../src/app/save';
import {runReplay} from '../src/agent/run';
import {hashWorld} from '../src/sim/world';
import type {Transcript} from '../src/agent/transcript';
it('replays immutable pre-revision protocol 31/32 recordings with their exact old observations',()=>{
 expect(expected.source).toBe('e64789d09d8056a4f28b5075cb9406e420d8fd83');
 for(const c of expected.cases){expect(c.transcript.header.observationVersion).toBe(17);expect(hashWorld(runReplay(deserializeWorld(c.initial),c.transcript as Transcript).world)).toBe(c.finalHash);}
});
