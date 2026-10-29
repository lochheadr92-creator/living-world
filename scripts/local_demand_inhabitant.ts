// STAGED supplies/skills. Two offered conversations execute before the beneficiary's turn.
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {localDemandScene} from '../tests/helpers/local_demand';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {runLive,runReplay} from '../src/agent/run';
import {stubModel} from '../src/agent/model';
import {observationFromPrompt} from '../src/agent/protocol';
import {conservationReport} from '../src/sim/economy';
import {hashWorld} from '../src/sim/world';
import {parseIntervention} from './lab/lab';
const out=process.argv[2];if(!out||existsSync(out))throw new Error('Fresh output directory required');mkdirSync(out,{recursive:true});
const reports=[];let initial='';
for(const arm of ['enabled','disabled'] as const){
 const restore=arm==='disabled'?parseIntervention('rich-no-local-demand').install!():()=>{};
 try{
  const f=localDemandScene();const before=serializeWorld(f.w);if(initial&&before!==initial)throw new Error('Initial worlds differ');initial=before;
  f.talk(f.a);f.talk(f.c);f.release();const start=serializeWorld(f.w);writeFileSync(`${out}/${arm}-demand-start.json`,start);
  const observations:unknown[]=[];let worked=false;
  const r=await runLive(f.w,f.b.id,stubModel('restricted-local-worker',req=>{
   const o=observationFromPrompt(req.user)!;observations.push(o);
   const work=!worked&&o.options.find(x=>x.label==='Hewing planks');if(work)worked=true;
   const pick=work||o.options.find(x=>x.kind==='rest')||o.options.find(x=>x.kind==='wander')||o.options[0];
   return JSON.stringify({choose:pick.key,why:'Use the ordinary offered plank work after hearing my neighbours, then take spare time.'});
  }),{until:f.w.tick+1500});
  const p=r.world.persons.find(p=>p.id===f.b.id)!,yard=r.world.buildings.find(b=>b.id===f.yard.id)!;
  const replay=runReplay(deserializeWorld(start),r.transcript);
  const report={arm,staged:true,externalModel:false,hash:hashWorld(r.world),fullReplayEqual:serializeWorld(r.world)===serializeWorld(replay.world),heard:p.heardDemand,trade:p.trade,produced:yard.ops!.produced,requests:r.world.requests.filter(r=>r.to===p.id),conservation:conservationReport(r.world)};
  for(const [name,data]of Object.entries({report,observations,transcript:r.transcript,final:serializeWorld(r.world)}))writeFileSync(`${out}/${arm}-${name}.json`,typeof data==='string'?data:JSON.stringify(data,null,2));reports.push(report);
  if(!report.fullReplayEqual||!report.conservation.ok||(report.produced.planks??0)<1||(arm==='enabled'?p.trade?.key!=='carpentry':p.trade!==null))throw new Error('Local demand contrast failed');
 }finally{restore();}
}
writeFileSync(`${out}/before-conversations.json`,initial);writeFileSync(`${out}/report.json`,JSON.stringify(reports,null,2));console.log(JSON.stringify(reports));
