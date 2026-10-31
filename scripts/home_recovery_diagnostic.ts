// Staged finite one-adult diagnostic, preserving both success and failure.
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {observedReplacementScene} from '../tests/helpers/home_replacement';
import {destroyBuilding} from '../src/sim/buildings';
import {refreshBeliefs} from '../src/sim/perception';
import {stepWorld} from '../src/sim/world';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
const [out,...versions]=process.argv.slice(2).filter(a=>a!=='--');if(!out||existsSync(out))throw new Error('Fresh output required');mkdirSync(out,{recursive:true});
const reports=(versions.length?versions.map(Number):[107,108]).map(version=>{
 const f=observedReplacementScene(version);destroyBuilding(f.w,f.home,'collapsed in sight');refreshBeliefs(f.w,f.p);
 const twin=deserializeWorld(serializeWorld(f.w)),events:unknown[]=[],samples:unknown[]=[];
 f.w.hooks={onActivityStart:(p,a)=>{if(p.id===f.p.id)events.push({tick:f.w.tick,event:'start',kind:a.kind,goal:a.goal,target:a.targetId});},onActivityEnd:(p,a,result,detail)=>{if(p.id===f.p.id)events.push({tick:f.w.tick,event:'end',kind:a.kind,result,detail});}};
 for(let n=0;n<12000;n++){stepWorld(f.w);stepWorld(twin);if(f.w.tick%300===0)samples.push({tick:f.w.tick,alive:f.p.alive,health:f.p.health,needs:{...f.p.needs},inv:{...f.p.inv},activity:f.p.activity?{kind:f.p.activity.kind,phase:f.p.activity.phase,target:f.p.activity.targetId}:null,home:f.hh.homeId,sites:f.w.sites.map(s=>({id:s.id,work:s.work,workTotal:s.workTotal,required:{...s.required},used:{...s.used},delivered:{...s.delivered}}))});}
 delete f.w.hooks;const final=serializeWorld(f.w),exact=final===serializeWorld(twin)&&serializeWorld(deserializeWorld(final))===final;
 writeFileSync(out+`/rules${version}-final.json`,final);
 return {version,tick:f.w.tick,alive:f.p.alive,home:f.hh.homeId,deaths:f.w.deceased,consumed:f.w.ledger.consumed,exact,conservation:conservationReport(f.w),events,samples};
});
writeFileSync(out+'/report.json',JSON.stringify({limits:'STAGED observed collapse, valid berry_bush source, finite goods, no controlled decisions. Both historical and candidate outcomes retained. Not ordinary frequency or an aggregate benefit comparison.',reports},null,2));
console.log(JSON.stringify(reports.map(({events,samples,...r})=>r)));
if(reports.some(r=>!r.exact||!r.conservation.ok))process.exitCode=1;
