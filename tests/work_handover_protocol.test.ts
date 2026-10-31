import {expect,it} from 'vitest';
import {continuityScene} from './helpers/continuity';
import {stubModel} from '../src/agent/model';
import {runLive,runReplay} from '../src/agent/run';
import {observationFromPrompt} from '../src/agent/protocol';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {perceive} from '../src/sim/perception';
import {conservationReport} from '../src/sim/economy';
import {personalHandovers} from '../src/sim/handover_state';
it.each([false,true])('uses only an offered handover and exactly replays the actual answer (memory %s)',async memory=>{
 const f=continuityScene(94,true);f.a.injury={kind:'sprain',since:0,until:2400,how:'declared incapacity'};f.a.cooldowns.pause=0;f.b.cooldowns.pause=0;f.b.nextThink=600;f.a.nextThink=0;perceive(f.w,f.a);perceive(f.w,f.b);
 const start=serializeWorld(f.w),model=stubModel('ask-handover',req=>{const o=observationFromPrompt(req.user)!;const offer=o.options.find(x=>x.key.includes('handover_work'))??o.options[0];return JSON.stringify({choose:offer.key,why:'Ask a housemate through an offered handover conversation'});});
 const result=await runLive(f.w,f.a.id,model,{until:100,memory});expect(result.transcript.calls.some(c=>c.result?.key?.includes('handover_work'))).toBe(true);expect(personalHandovers(result.world.persons.find(p=>p.id===f.b.id)!)[0]?.state).toBe('accepted');expect(conservationReport(result.world).ok).toBe(true);expect(serializeWorld(runReplay(deserializeWorld(start),result.transcript).world)).toBe(serializeWorld(result.world));
});
