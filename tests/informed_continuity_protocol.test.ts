import {expect,it} from 'vitest';
import {continuityScene} from './helpers/continuity';
import {stubModel} from '../src/agent/model';
import {runLive,runReplay} from '../src/agent/run';
import {observationFromPrompt} from '../src/agent/protocol';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {perceive} from '../src/sim/perception';
import {conservationReport,snapshotInitial} from '../src/sim/economy';
import {makeSource} from '../src/sim/sources';
import {observe} from '../src/sim/knowledge';
it.each([false,true])('executes only an offered work-sharing conversation and replays heard knowledge (memory %s)',async memory=>{
 const f=continuityScene();
 // Unlike a manually started conversation, the AI turn first reviews plan viability.
 // Declare a real known timber source so that the shelter undertaking still exists when spoken.
 observe(f.w,f.a,makeSource(f.w,'tree',36,40,12));
 snapshotInitial(f.w); // include the declared source in the initial ledger, before any simulation.
 f.a.cooldowns.pause=0;f.b.cooldowns.pause=0;f.b.nextThink=600;f.a.nextThink=0;perceive(f.w,f.a);perceive(f.w,f.b);
 const start=serializeWorld(f.w),model=stubModel('tell-housemate',req=>{const o=observationFromPrompt(req.user)!;const offer=o.options.find(x=>x.key.includes('share_work'))??o.options[0];return JSON.stringify({choose:offer.key,why:'Tell a housemate about my own work using an offered conversation'});});
 const result=await runLive(f.w,f.a.id,model,{until:100,memory});expect(result.transcript.calls.some(c=>c.result?.key?.includes('share_work'))).toBe(true);
 expect(result.world.persons.find(p=>p.id===f.b.id)!.relations[f.a.id].workHeard?.[0].planId).toBe(f.plan.id);expect(conservationReport(result.world).ok).toBe(true);
 expect(serializeWorld(runReplay(deserializeWorld(start),result.transcript).world)).toBe(serializeWorld(result.world));
});
