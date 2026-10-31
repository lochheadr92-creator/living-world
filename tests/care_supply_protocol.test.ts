import {expect,it} from 'vitest';
import {careSupplyScene} from './helpers/care_supply';
import {stubModel} from '../src/agent/model';
import {runLive,runReplay} from '../src/agent/run';
import {observationFromPrompt} from '../src/agent/protocol';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
it.each([false,true])('uses offered care acquisition and exactly replays a paid receipt (memory %s)',async memory=>{
 const f=careSupplyScene(),start=serializeWorld(f.w),model=stubModel('care-supply',req=>{const o=observationFromPrompt(req.user)!;const offer=o.options.find(x=>x.key.startsWith('care_supply:'))??o.options.find(x=>x.key.startsWith('give:'))??o.options[0];return JSON.stringify({choose:offer.key,why:'Obtain and return with supplies for the personally observed need'});});
 const result=await runLive(f.w,f.helper.id,model,{until:240,memory});expect(result.transcript.calls.some(c=>c.result?.key?.startsWith('care_supply:'))).toBe(true);
 expect(result.world.persons.find(p=>p.id===f.helper.id)?.careJourney?.phase).toBe('delivered');expect(conservationReport(result.world).ok).toBe(true);expect(serializeWorld(runReplay(deserializeWorld(start),result.transcript).world)).toBe(serializeWorld(result.world));
});
