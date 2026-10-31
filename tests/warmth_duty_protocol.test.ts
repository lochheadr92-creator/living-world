import {expect,it} from 'vitest';
import {warmthDutyScene,requestWarmth} from './helpers/warmth_duty';
import {stubModel} from '../src/agent/model';
import {runLive,runReplay} from '../src/agent/run';
import {observationFromPrompt} from '../src/agent/protocol';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
it.each([false,true])('legal fire-duty offers physically fulfil and replay exactly (notes %s)',async memory=>{
 const f=warmthDutyScene();requestWarmth(f);const initial=serializeWorld(f.w),model=stubModel('warmth-duty',req=>{const o=observationFromPrompt(req.user)!;const choice=o.options.find(x=>x.kind==='fuel_fire')??o.options.find(x=>x.kind==='gather'&&x.goal.includes('promised'))??o.options[0];return JSON.stringify({choose:choice.key,why:'Obtain physical fuel and keep the accepted fire duty'});});
 const result=await runLive(f.w,f.helper.id,model,{until:1100,memory});expect(result.transcript.calls.some(c=>c.result?.key?.startsWith('fuel:'))).toBe(true);expect(result.world.persons.find(p=>p.id===f.helper.id)?.commitments.find(c=>c.milestone==='fire kept')?.status).toBe('done');expect(conservationReport(result.world).ok).toBe(true);expect(serializeWorld(runReplay(deserializeWorld(initial),result.transcript).world)).toBe(serializeWorld(result.world));
});
