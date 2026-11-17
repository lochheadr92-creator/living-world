import { mkdirSync, writeFileSync } from 'node:fs';
import { createWorld } from '../../src/sim/factory';
import { currentWorldSettings } from '../../src/sim/profiles';
import { DAY } from '../../src/sim/constants';
import { runLive } from '../../src/agent/run';
import { observationFromPrompt } from '../../src/agent/protocol';
import { DEFAULT_BUDGET } from '../../src/agent/model';
import type { ModelClient } from '../../src/agent/model';
import { openaiModel } from '../../scripts/inhabit/openai';
import { sourcesFingerprint } from '../../scripts/inhabit/sources';
import { serializeWorld } from '../../src/app/save';
const out='review_evidence/civilian-fifteen-days-20261113/hybrid';
mkdirSync(out,{recursive:true});
const world=createWorld(currentWorldSettings('normal','river',{immigration:true}));
const person=world.persons.find(p=>p.name==='Ines')!;
const ai=openaiModel({model:process.env.HYBRID_MODEL||'gpt-4.1-mini'});
let lastDay=-1,aiCalls=0,routine=0;
const model:ModelClient={id:'hybrid:meaningful-ai+routine',kind:'api',config:{policy:'first meaningful opportunity per day AI; routine engine-ranked first option',model:ai.id},async complete(req,signal){
 const o=observationFromPrompt(req.user);
 if(!o) throw new Error('observation unavailable');
 const day=Math.floor(o.time.tick/DAY);
 const meaningful=o.options.some(x=>/socialize|court|partner|romance|explore|visit|family|propose|help|care|meet/.test(x.kind+' '+x.key));
 if(day!==lastDay && meaningful && aiCalls<20){
   lastDay=day;aiCalls++;
   try{
    const response=await ai.complete({...req,system:req.system+'\\nPersonal aims: survive, explore, develop reciprocal relationships and potentially start a family. Choose only offered actions. Give priority to critical needs. Keep journal concise.'},signal);
    writeFileSync(out+'/ai-'+aiCalls+'.json',JSON.stringify({day,tick:o.time.tick,reply:response.text}));
    return response;
   }catch(e){writeFileSync(out+'/ai-error-'+aiCalls+'.txt',String(e));}
 }
 routine++;
 const key=o.options[0]?.key??'wander';
 return {text:JSON.stringify({choose:key,why:'Routine: following the first eligible engine-ranked action.'})};
}};
const result=await runLive(world,person.id,model,{until:15*DAY,memory:true,sources:sourcesFingerprint(),budget:{...DEFAULT_BUDGET,maxCallsPerDay:1000,timeoutMs:60000,maxRetryMs:0}});
writeFileSync(out+'/transcript.json',JSON.stringify(result.transcript));
writeFileSync(out+'/final-world.json',serializeWorld(result.world));
writeFileSync(out+'/summary.json',JSON.stringify({aiCalls,routine,end:result.transcript.end,person:result.world.persons.find(p=>p.id===person.id)},null,2));
console.log(JSON.stringify({aiCalls,routine,end:result.transcript.end},null,2));
