// Bounded ordinary activation census, not a benefit experiment. Fixed seeds, no intervention or reroll.
import {mkdirSync,existsSync,writeFileSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld} from '../src/sim/world';
import {generateOptions} from '../src/sim/decision';
import {childrenNeedingWatch,laidUp} from '../src/sim/responsibilities';
import {serializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
import {DAY} from '../src/sim/constants';
import {gitProvenance,sourceManifest} from './observers/provenance';
const out=process.argv[2];if(!out||existsSync(out))throw new Error('Fresh output directory required');
mkdirSync(out,{recursive:true});
const results=[];const began=performance.now(),limitMs=120000;
for(const seed of ['meadow','river','forest']){
 const w=createWorld(currentWorldSettings('normal',seed,{immigration:false}));
 const counts={personSamples:0,incapacitatedSamples:0,parentsWithUncoveredChildren:0,requestOffers:0,watchOffers:0,watchStarts:0,watchFoodUnits:0,watchWaterUnits:0};
 const requests=new Map<number,{from:number;to:number;status:string;tick:number}>(),endings:unknown[]=[];const active=new Map<number,{id:number;label:string;start:number}>();
 w.hooks={onActivityStart(p,a){if(a.data.watch){counts.watchStarts++;active.set(p.id,{id:a.id,label:a.label,start:w.tick});}},onTransfer(t){if(t.reason==='watched over'){if(t.item==='water')counts.watchWaterUnits+=t.n;else counts.watchFoodUnits+=t.n;}}};
 let stop='horizon';
 while(w.tick<5*DAY){
  stepWorld(w);
  for(const r of w.requests)if(r.kind==='watch')requests.set(r.id,{from:r.from,to:r.to,status:r.status,tick:w.tick});
  for(const [id,act]of active){const p=w.byId.get(id);if(p?.ent==='person'&&(p.activity?.id===act.id||p.suspended?.id===act.id))continue;const result=p?.ent==='person'?p.lastResult:null;endings.push({by:id,tick:w.tick,result:result&&result.tick>=act.start&&result.label===act.label?result:null});active.delete(id);}
  if(w.tick%240===0){
   const before=serializeWorld(w);
   for(const p of w.persons.filter(p=>p.alive)){
    counts.personSamples++;if(laidUp(w,p))counts.incapacitatedSamples++;if(childrenNeedingWatch(w,p).length)counts.parentsWithUncoveredChildren++;
    const ctx=generateOptions(w,p,true,true);counts.requestOffers+=ctx.options.filter(o=>o.kind==='socialize'&&o.label.includes('keep an eye on')).length;counts.watchOffers+=ctx.options.filter(o=>o.key.startsWith('watch:')).length;
   }
   if(serializeWorld(w)!==before)throw new Error('Observer mutation');
   if(!conservationReport(w).ok)throw new Error('Conservation failure');
   if(performance.now()-began>limitMs){stop='budget';break;}
  }
 }
 results.push({seed,settings:w.settings,tick:w.tick,stop,counts,requests:[...requests.values()],endings,active:[...active],conservation:conservationReport(w)});
 if(stop==='budget')break;
}
const paths=['scripts/practical_care_observe.ts','src/sim/responsibilities.ts','src/sim/options_work.ts','src/sim/social.ts','src/sim/welfare.ts','src/sim/rulesversion.ts'];
const report={...gitProvenance(),sourceHashes:sourceManifest(paths),question:'Do ordinary five-day Normal worlds expose and select practical childcare? Fixed seeds and no staged injuries or resources. Zero opportunities remain zero, not success.',budgetSeconds:120,seconds:(performance.now()-began)/1000,results};
writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(results.map(({seed,tick,stop,counts,requests,endings})=>({seed,tick,stop,counts,requests,endings}))));
if(results.some(r=>r.stop!=='horizon'))process.exitCode=2;
