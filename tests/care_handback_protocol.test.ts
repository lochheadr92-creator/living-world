import {expect,it} from 'vitest';
import {careHandbackScene} from './helpers/care_handback';
import {stubModel} from '../src/agent/model';
import {runLive,runReplay} from '../src/agent/run';
import {observationFromPrompt} from '../src/agent/protocol';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
it.each([false,true])('legal childcare return is answered and replayed exactly (notes %s)',async memory=>{
 const f=careHandbackScene(),initial=serializeWorld(f.w),model=stubModel('care-handback',req=>{const o=observationFromPrompt(req.user)!,choice=o.options.find(x=>x.goal.includes('handback'))??o.options[0];return JSON.stringify({choose:choice.key,why:'Discuss taking childcare back with the helper'});});
 const result=await runLive(f.w,f.parent.id,model,{until:520,memory});expect(result.transcript.calls.some(c=>c.result?.key?.includes('return_care'))).toBe(true);expect(result.world.persons.find(p=>p.id===f.parent.id)?.socialMemory?.find(m=>m.task?.kind==='watch')?.careHandback?.state).toBe('accepted');expect(conservationReport(result.world).ok).toBe(true);expect(serializeWorld(runReplay(deserializeWorld(initial),result.transcript).world)).toBe(serializeWorld(result.world));
});
