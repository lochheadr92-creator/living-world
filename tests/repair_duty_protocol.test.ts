import {expect,it} from 'vitest';
import {repairDutyScene,requestRepair} from './helpers/repair_duty';
import {stubModel} from '../src/agent/model';
import {runLive,runReplay} from '../src/agent/run';
import {observationFromPrompt} from '../src/agent/protocol';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
it.each([false,true])('legal roof patch acquires real material, repairs and replays exactly (notes %s)',async memory=>{
 const f=repairDutyScene();requestRepair(f);const initial=serializeWorld(f.w),model=stubModel('roof-patch',req=>{const o=observationFromPrompt(req.user)!,choice=o.options.find(x=>x.kind==='repair')??o.options.find(x=>x.goal.includes('wood patch'))??o.options[0];return JSON.stringify({choose:choice.key,why:'Obtain the patch and repair the roof I agreed to help with'});});
 const result=await runLive(f.w,f.helper.id,model,{until:1900,memory});expect(result.transcript.calls.some(c=>c.result?.key?.startsWith('repair:'))).toBe(true);expect(result.world.persons.find(p=>p.id===f.helper.id)?.commitments.find(c=>c.milestone==='sound again')?.status).toBe('done');expect(result.world.ledger.reasons['-repairs']).toBeGreaterThan(0);expect(conservationReport(result.world).ok).toBe(true);expect(serializeWorld(runReplay(deserializeWorld(initial),result.transcript).world)).toBe(serializeWorld(result.world));
});
