// STAGED prior project knowledge; all new benefit and political responses execute normally.
import { existsSync,mkdirSync,writeFileSync } from 'node:fs';
import { civicBenefitScene } from '../tests/helpers/civic_benefit';
import { serializeWorld,deserializeWorld } from '../src/app/save';
import { runLive,runReplay } from '../src/agent/run';
import { stubModel } from '../src/agent/model';
import { observationFromPrompt } from '../src/agent/protocol';
import { conservationReport } from '../src/sim/economy';
import { hashWorld } from '../src/sim/world';
import { parseIntervention } from './lab/lab';
const out=process.argv[2];if(!out||existsSync(out))throw new Error('Fresh output directory required');mkdirSync(out,{recursive:true});
const f=civicBenefitScene(),start=serializeWorld(f.w);writeFileSync(`${out}/civic-start.json`,start);
const reports=[];
for(const arm of ['enabled','disabled'] as const){
 const restore=arm==='disabled'?parseIntervention('rich-no-civic-benefit').install!():()=>{};
 try{
  const observations:unknown[]=[];let collected=false;
  const r=await runLive(deserializeWorld(start),f.b.id,stubModel('restricted-beneficiary',req=>{
   const o=observationFromPrompt(req.user)!;observations.push(o);
   const take=!collected&&o.options.find(x=>x.kind==='withdraw'&&x.label.includes('stone'));
   if(take)collected=true;
   const pick=take||o.options.find(x=>x.kind==='rest')||o.options.find(x=>x.kind==='wander')||o.options[0];
   return JSON.stringify({choose:pick.key,why:'Collect offered materials for my work, then take spare time while neighbours act.'});
  }),{until:f.w.tick+650});
  const p=r.world.persons.find(p=>p.id===f.b.id)!,q=r.world.civicProjects!.find(q=>q.id===f.q.id)!;
  const replay=runReplay(deserializeWorld(start),r.transcript);
  const report={arm,staged:true,externalModel:false,hash:hashWorld(r.world),fullReplayEqual:serializeWorld(r.world)===serializeWorld(replay.world),memory:p.civicOutcomes,inventory:p.inv,participation:q.participants.find(m=>m.personId===p.id),requests:r.world.requests.filter(q=>q.to===p.id),conservation:conservationReport(r.world)};
  for(const [name,data]of Object.entries({report,observations,transcript:r.transcript,final:serializeWorld(r.world)}))writeFileSync(`${out}/${arm}-${name}.json`,typeof data==='string'?data:JSON.stringify(data,null,2));reports.push(report);
  if(!report.fullReplayEqual||!report.conservation.ok||report.participation?.supports!==(arm==='enabled'?f.a.id:f.c.id))throw new Error('Civic benefit contrast failed');
 }finally{restore();}
}
writeFileSync(`${out}/report.json`,JSON.stringify(reports,null,2));console.log(JSON.stringify(reports));
