// STAGED: needed charcoal production -> offered learner request -> timed lesson -> real batch.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { learnerScene } from '../tests/helpers/learner_instruction';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { runLive, runReplay } from '../src/agent/run';
import { stubModel } from '../src/agent/model';
import { observationFromPrompt } from '../src/agent/protocol';
import { conservationReport } from '../src/sim/economy';
import { hashWorld } from '../src/sim/world';
import { parseIntervention } from './lab/lab';
const out=process.argv[2];if(!out||existsSync(out))throw new Error('Fresh output directory required');
mkdirSync(out,{recursive:true});
const f=learnerScene(),start=serializeWorld(f.w);
writeFileSync(`${out}/learner-start.json`,start);
const reports=[];
for(const arm of ['enabled','disabled'] as const){
 const restore=arm==='disabled'?parseIntervention('rich-no-learner-instruction').install!():()=>{};
 try{
  const w=deserializeWorld(start), observations:NonNullable<ReturnType<typeof observationFromPrompt>>[]=[], milestones:unknown[]=[];
  let learned=false,produced=false;
  const r=await runLive(w,f.b.id,stubModel('restricted-learner',req=>{
   const o=observationFromPrompt(req.user)!;observations.push(o);
   const a=o.options.find(a=>a.label==='Ask Ada to teach charcoal firing')??o.options.find(a=>a.label==='Burning charcoal')??o.options.find(a=>a.kind==='rest'||a.kind==='wander')??o.options[0];
   return JSON.stringify({choose:a.key,why:'Ask for the technique my offered work lacks, then use it at the kiln when offered.'});
  }),{until:w.tick+1400,onTick(current){
   const p=current.persons.find(p=>p.id===f.b.id)!,kiln=current.buildings.find(b=>b.id===f.kiln.id)!;
   if(!learned&&p.techniques?.charcoal){learned=true;milestones.push({tick:current.tick,kind:'learned',knowledge:{...p.techniques.charcoal}});}
   if(!produced&&(kiln.store.items.charcoal??0)>0){produced=true;milestones.push({tick:current.tick,kind:'produced',store:{...kiln.store.items}});}
  }});
  const replay=runReplay(deserializeWorld(start),r.transcript),p=r.world.persons.find(p=>p.id===f.b.id)!;
  const report={arm,staged:true,externalModel:false,hash:hashWorld(r.world),fullReplayEqual:serializeWorld(replay.world)===serializeWorld(r.world),learned,produced,knowledge:p.techniques,milestones,conservation:conservationReport(r.world)};
  for(const [name,value]of Object.entries({report,observations,transcript:r.transcript,final:serializeWorld(r.world)}))writeFileSync(`${out}/${arm}-${name}.json`,typeof value==='string'?value:JSON.stringify(value,null,2));
  reports.push(report);
  if(!report.fullReplayEqual||!report.conservation.ok||learned!==(arm==='enabled')||produced!==(arm==='enabled'))throw new Error('Learner chain did not satisfy the registered contrast');
 }finally{restore();}
}
writeFileSync(`${out}/report.json`,JSON.stringify(reports,null,2));console.log(JSON.stringify(reports));
