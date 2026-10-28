// Staged mechanism comparisons; restricted offered-action policies, no external model.
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { materialPlanScene, materialPromiseScene, materialChoice } from '../tests/helpers/stored_materials';
import { observeNow } from '../tests/helpers/inhabit';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { runLive, runReplay } from '../src/agent/run';
import { stubModel } from '../src/agent/model';
import { observationFromPrompt } from '../src/agent/protocol';
import { conservationReport, transfer } from '../src/sim/economy';
import { hashWorld } from '../src/sim/world';
import { parseIntervention } from './lab/lab';

const out=process.argv[2];if(!out||existsSync(out))throw new Error('Supply a fresh evidence directory');
mkdirSync(out,{recursive:true});
const write=(n:string,v:unknown)=>writeFileSync(`${out}/${n}`,typeof v==='string'?v:JSON.stringify(v,null,2));
const paths=[...readdirSync('src',{recursive:true}).map(String).filter(p=>p.endsWith('.ts')).map(p=>'src/'+p),'scripts/stored_materials_inhabitant.ts','scripts/lab/lab.ts','tests/helpers/stored_materials.ts'].sort();
const manifest=()=>Object.fromEntries(paths.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));
const source=manifest();write('provenance.json',{head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),source,staged:true});
const reports=[];
let promiseCheckpoint='';
for(const scenario of ['plan','promise'] as const){
  const fixture=scenario==='plan'?materialPlanScene():materialPromiseScene();
  const start=serializeWorld(fixture.w);write(`${scenario}-start.json`,start);
  for(const arm of ['enabled','disabled'] as const){
    const w=deserializeWorld(start),actor=w.persons.find(p=>p.id===fixture.ada.id)!;
    const restore=arm==='disabled'?parseIntervention(`rich-no-stored-material-${scenario==='plan'?'plans':'promises'}`).install!():()=>{};
    try{
      const observations:NonNullable<ReturnType<typeof observationFromPrompt>>[]=[],milestones:unknown[]=[];
      let prevStore={...w.buildings.find(b=>b.id===fixture.store.id)!.store.items};
      let delivered=0,crafted=false;
      const result=await runLive(w,actor.id,stubModel('restricted-stored-materials',req=>{
        const o=observationFromPrompt(req.user)!;observations.push(o);
        return JSON.stringify({choose:materialChoice(o,scenario).key,why:scenario==='plan'?'Use the offered known store, then make and use my axe.':'Ask the offered helper, allow an accepted promise time, then make my pick.'});
      }),{until:w.tick+1300,onTick(current){
        const r=current.requests.find(r=>r.from===actor.id&&r.item==='stone');
        if(scenario==='promise'&&arm==='enabled'&&r?.status==='promised'&&!promiseCheckpoint){promiseCheckpoint=serializeWorld(current);write('promise-midpoint.json',promiseCheckpoint);}
        if(r&&(r.delivered??0)>delivered){milestones.push({tick:current.tick,stage:'delivered',request:{...r}});delivered=r.delivered??0;}
        const store=current.buildings.find(b=>b.id===fixture.store.id)!;
        for(const item of ['stone','wood'] as const)if((store.store.items[item]??0)!==(prevStore[item]??0))milestones.push({tick:current.tick,stage:'store-stock-change',item,before:prevStore[item]??0,after:store.store.items[item]??0});
        prevStore={...store.store.items};
        const p=current.persons.find(p=>p.id===actor.id)!;
        if(!crafted&&p.intentions.some(i=>i.kind==='tool'&&i.status==='done')){crafted=true;milestones.push({tick:current.tick,stage:'crafted',plans:p.intentions.map(i=>({...i,wants:{...i.wants}}))});}
      }});
      const replay=runReplay(deserializeWorld(start),result.transcript);
      const p=result.world.persons.find(p=>p.id===actor.id)!;
      const report={scenario,arm,firstChoice:observations[0]?.options.find(o=>o.key===materialChoice(observations[0],scenario).key)?.label,
        requests:result.world.requests.filter(r=>r.from===actor.id),inventory:p.inv,plans:p.intentions,relations:p.relations,socialMemory:p.socialMemory??[],
        tools:result.world.tools.filter(t=>t.holder===p.id),milestones,hash:hashWorld(result.world),replayHash:hashWorld(replay.world),
        fullReplayEqual:serializeWorld(result.world)===serializeWorld(replay.world),conservation:conservationReport(result.world)};
      reports.push(report);write(`${scenario}-${arm}-report.json`,report);write(`${scenario}-${arm}-transcript.json`,result.transcript);write(`${scenario}-${arm}-observations.json`,observations);write(`${scenario}-${arm}-final.json`,serializeWorld(result.world));
      if(!report.fullReplayEqual||!report.conservation.ok)throw new Error('Replay or conservation failed');
      if(arm==='enabled'&&!(p.inv[scenario==='plan'?'axe':'pick']))throw new Error('Staged completion failed');
      if(scenario==='promise'&&arm==='enabled'&&!report.requests.some(r=>r.status==='fulfilled'&&r.delivered===2))throw new Error('Delivery not demonstrated');
      if(scenario==='promise'&&arm==='disabled'&&!report.requests.some(r=>r.status==='declined'&&r.note==='making'))throw new Error('Expected preserved refusal absent');
    }finally{restore();}
  }
}
if(!promiseCheckpoint)throw new Error('No accepted midpoint');
// Replay a helper's side independently, using only their own commitment and offers.
const hw=deserializeWorld(promiseCheckpoint),helper=hw.persons.find(p=>p.name==='Ben')!;
const helperSeen:NonNullable<ReturnType<typeof observationFromPrompt>>[]=[];
const hr=await runLive(hw,helper.id,stubModel('restricted-stored-helper',req=>{
  const o=observationFromPrompt(req.user)!;helperSeen.push(o);
  const choice=o.options.find(a=>a.kind==='give'&&/promised/.test(a.label))??o.options.find(a=>a.kind==='withdraw'&&/stone/.test(a.label)&&/promise/.test(a.goal))??o.options[0];
  return JSON.stringify({choose:choice.key,why:'Collect material I remember to keep my own promise, then take it to the person.'});
}),{until:hw.tick+800});
write('helper-observations.json',helperSeen);write('helper-transcript.json',hr.transcript);write('helper-final.json',serializeWorld(hr.world));
const helperReplay=runReplay(deserializeWorld(promiseCheckpoint),hr.transcript);
if(serializeWorld(helperReplay.world)!==serializeWorld(hr.world)||!conservationReport(hr.world).ok)throw new Error('Helper replay failed');
// A labelled stale-knowledge failure uses a real competing transfer; no goods vanish.
const failure=materialPlanScene();transfer(failure.w,failure.store.store.items,failure.outsider.inv,999,'stone',4,`building:${failure.store.id}`,`person:${failure.outsider.id}`,'staged competing withdrawal');
write('stale-start.json',serializeWorld(failure.w));write('stale-observation.json',observeNow(failure.w,failure.ada));
if(JSON.stringify(source)!==JSON.stringify(manifest()))throw new Error('Source changed during evidence run');
write('report.json',{staged:true,externalModel:false,reports:reports.map(r=>({scenario:r.scenario,arm:r.arm,firstChoice:r.firstChoice,inventory:r.inventory,requests:r.requests,milestones:r.milestones,hash:r.hash,fullReplayEqual:r.fullReplayEqual,conservation:r.conservation})),helper:{hash:hashWorld(hr.world),fullReplayEqual:true,choices:helperSeen.map(o=>({tick:o.time.tick,promises:o.people.promises,options:o.options.filter(a=>/promise/.test(a.goal))}))}});
console.log(JSON.stringify(reports.map(r=>({scenario:r.scenario,arm:r.arm,firstChoice:r.firstChoice,inventory:r.inventory,requests:r.requests.map(x=>({status:x.status,delivered:x.delivered??0})),hash:r.hash,fullReplayEqual:r.fullReplayEqual}))));
