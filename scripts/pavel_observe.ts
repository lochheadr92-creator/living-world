// Ordinary activation screen, plus a scripted LiveSession replay. Neither is a rendered visit or benefit study.
import {mkdirSync,writeFileSync,readdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld,hashWorld} from '../src/sim/world';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
import {DAY} from '../src/sim/constants';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {observeInhabitant} from '../src/agent/observe';
import {runLive,runReplay} from '../src/agent/run';
import {stubModel,DEFAULT_BUDGET} from '../src/agent/model';
import {observationFromPrompt} from '../src/agent/protocol';
import {sourcesFingerprint} from './inhabit/sources';
import {gitProvenance,sourceManifest} from './observers/provenance';
const [out]=process.argv.slice(2).filter(a=>a!=='--');if(!out||existsSync(out))throw new Error('Fresh output directory required');
const files=['src','scripts/observers'].flatMap(root=>readdirSync(root,{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>root+'/'+f)).concat('scripts/pavel_observe.ts').sort();
const source=sourceManifest(files),provenance=gitProvenance(),sha=(s:string)=>createHash('sha256').update(s).digest('hex');
mkdirSync(out,{recursive:true});const ordinary=[];
for(const seed of ['meadow','river','forest']){
 const w=createWorld(currentWorldSettings('normal',seed,{immigration:true})),twin=deserializeWorld(serializeWorld(w));
 const initial=sha(serializeWorld(w));let starts=0,companyStarts=0,lessonStarts=0,observerChecks=0;const samples:any[]=[];
 w.hooks={onActivityStart:(p,a)=>{starts++;if(p.lastDecision?.because.includes('continuing company'))companyStarts++;if(a.data.purpose==='teach_technique')lessonStarts++;}};
 for(let n=0;n<5*DAY;n++){
  if(n%600===0){const before=serializeWorld(w);for(const p of w.persons.filter(p=>p.alive)){
   const ctx=generateOptions(w,p,true,true);const obs=observeInhabitant(w,p,ctx,rankOptions(ctx));
   if(p.goal?.companyHope&&samples.length<6)samples.push({tick:w.tick,person:p.id,observation:obs});
  }if(serializeWorld(w)!==before)throw new Error('Observer mutated world');observerChecks++;}
  stepWorld(w);stepWorld(twin);
  if(w.tick%DAY===0&&!conservationReport(w).ok)throw new Error('Conservation failed');
 }
 delete w.hooks;if(serializeWorld(w)!==serializeWorld(twin))throw new Error('Observed twin differs');
 const copy=deserializeWorld(serializeWorld(w));for(let n=0;n<120;n++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy))throw new Error('Saved continuation differs');
 const people=w.persons.filter(p=>p.alive),report={seed,tick:w.tick,initial,final:sha(serializeWorld(w)),hash:hashWorld(w),starts,companyStarts,lessonStarts,peopleWithCompany:people.filter(p=>Object.values(p.relations).some(r=>r.company)).length,revisedHopes:people.filter(p=>p.goal?.companyHope).map(p=>({id:p.id,name:p.name,goal:p.goal})),toolReconsiderations:w.persons.flatMap(p=>p.intentions.filter(i=>i.kind==='tool'&&i.reason.includes('capacity')).map(i=>({person:p.id,reason:i.reason}))),deaths:w.persons.filter(p=>!p.alive).map(p=>({id:p.id,name:p.name})),observerChecks,exactTwin:true,exactSaveContinuation:true,conservation:conservationReport(w)};
 ordinary.push(report);writeFileSync(out+'/'+seed+'-observations.json',JSON.stringify(samples,null,2));writeFileSync(out+'/'+seed+'-final.json',serializeWorld(w));console.log(JSON.stringify(report));
}
const liveWorld=createWorld(currentWorldSettings('normal','meadow',{immigration:true}));for(let n=0;n<DAY;n++)stepWorld(liveWorld);
const p=liveWorld.persons.find(p=>p.alive&&p.name==='Pavel');if(!p)throw new Error('Pavel missing');
const initial=serializeWorld(liveWorld),sources=sourcesFingerprint();
const model=stubModel('pavel-regression-script',req=>{const obs=observationFromPrompt(req.user);if(!obs?.options.length)throw new Error('No offered options');return JSON.stringify({choose:obs.options[0].key,why:'Scripted first offered option; controller regression, not manual inhabiting'});});
const live=await runLive(liveWorld,p.id,model,{until:2*DAY,sources,budget:{...DEFAULT_BUDGET,maxCallsPerDay:1000}});
const replay=runReplay(deserializeWorld(initial),live.transcript,{sources});
if(serializeWorld(live.world)!==serializeWorld(replay.world)||!conservationReport(live.world).ok)throw new Error('Live replay differs');
writeFileSync(out+'/live-initial.json',initial);writeFileSync(out+'/live-transcript.json',JSON.stringify(live.transcript,null,2));writeFileSync(out+'/live-final.json',serializeWorld(live.world));
if(JSON.stringify(source)!==JSON.stringify(sourceManifest(files)))throw new Error('Source changed during screen');
const report={provenance,source,ordinary,live:{person:p.id,end:live.transcript.end,exactSaveReplay:true,conservation:conservationReport(live.world),warnings:replay.warnings},limits:'Five-day fresh normal activation screens with immigration, plus 120-tick saved continuation. No aggregate benefit or mature-world claim. LiveSession uses a scripted first offered choice; not a manual visit. Browser disabled in Work settings, no rendered verification.'};
writeFileSync(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report.live));
