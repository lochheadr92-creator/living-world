import {expect,it} from 'vitest';
import {floodScene} from './helpers/flood';
import {beginFlood,observeFlood} from '../src/sim/flood';
import {stubModel} from '../src/agent/model';
import {runLive,runReplay} from '../src/agent/run';
import {observationFromPrompt,observationVersionFor,PROTOCOL_V25,PROTOCOL_V26,PROTOCOL_V33,PROTOCOL_V34} from '../src/agent/protocol';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
it.each([false,true])('replays actual legal food travel with dated flood observations (memory %s)',async memory=>{
 const {w,p,food}=floodScene();p.x=39.5;beginFlood(w);observeFlood(w,p);p.cooldowns.pause=0;p.nextThink=0;const initial=serializeWorld(w);
 const model=stubModel('local-flood',req=>{const o=observationFromPrompt(req.user)!;const chosen=o.options.find(a=>a.kind==='gather'&&a.target?.includes('berry'))??o.options[0];return JSON.stringify({choose:chosen.key,why:'Take an offered action using my dated ground observations'});});
 const result=await runLive(w,p.id,model,{until:500,memory});expect(result.transcript.header.protocol).toBe(memory?PROTOCOL_V34:PROTOCOL_V33);expect(result.transcript.header.observationVersion).toBe(18);
 const floods=result.transcript.asks[0].observation.remembered.floods;expect(floods?.some(b=>b.state==='flooded')).toBe(true);expect(JSON.stringify(floods)).not.toContain('recoveryUntil');
 expect(result.world.persons.find(q=>q.id===p.id)?.stats.gathered).toBeGreaterThan(0);expect(conservationReport(result.world).ok).toBe(true);
 expect(serializeWorld(runReplay(deserializeWorld(initial),result.transcript).world)).toBe(serializeWorld(result.world));
});
it('retains the recorded water observation mapping for protocols 25 and 26',()=>{for(const p of [PROTOCOL_V25,PROTOCOL_V26])expect(observationVersionFor(p)).toBe(14);});
