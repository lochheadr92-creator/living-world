// Short observational continuation of existing ordinary worlds; no fixtures, interventions or retuning.
// npx vite-node scripts/programme_checkpoint.ts -- <directory-containing-obs-45-SEED> <output-directory>
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {join,resolve} from 'node:path';
import {deserializeWorld,serializeWorld} from '../src/app/save';
import {generateOptions} from '../src/sim/decision';
import {stepWorld} from '../src/sim/world';
import {conservationReport} from '../src/sim/economy';
import {isDependent,isAdultWorker} from '../src/sim/people';
import {estimatedAmount} from '../src/sim/knowledge';
import type {Activity,Person} from '../src/sim/types';
const [root,out='viewer_evidence/checkpoint']=process.argv.slice(2).filter(s=>s!=='--');
if(!root)throw new Error('Pass the existing continuity evidence directory.');mkdirSync(out,{recursive:true});
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const rows=[];
const sourceKinds=new Set(['berry_bush','fruit_tree','tree','rock','fish_spot','wild_grain','clay_pit','ore_vein','outcrop']);
for(const seed of ['meadow','river','forest']){
 const path=join(root,`obs-45-${seed}`,'final.json'),raw=readFileSync(path,'utf8'),w=deserializeWorld(raw),copy=deserializeWorld(raw),start=w.tick;
 const offers:Record<string,number>={},starts:Record<string,number>={},transfers:Record<string,number>={};
 let personSamples=0,dependentNeedSamples=0,incapacitySamples=0,damagedSharedKnownSamples=0,emptyRememberedSources=0,sourceReoffers=0,reoffersDespiteEmptyEstimate=0,pure=true;
 const pending:{p:Person;a:Activity;start:number}[]=[],ends:unknown[]=[];
 const initial={people:w.persons.filter(p=>p.alive).length,households:w.households.length,events:w.events.length,consumed:{...w.ledger.reasons},repairs:w.ledger.reasons['-repairs']??0};
 const census=()=>w.households.map(h=>{const members=w.persons.filter(p=>p.alive&&p.hhId===h.id);return {id:h.id,members:members.length,dependants:members.filter(p=>isDependent(w,p)).length,capable:members.filter(p=>isAdultWorker(w,p)&&!isDependent(w,p)&&!p.injury&&!(p.illness&&p.illness.severity>=.4)).length};});
 const householdsBefore=census();
 const bump=(r:Record<string,number>,k:string,n=1)=>r[k]=(r[k]??0)+n;
 w.hooks={onActivityStart:(p,a)=>{bump(starts,a.kind);if(a.kind==='give'||a.kind==='visit')bump(starts,`${a.kind}:${a.data.mode??(a.data.watch?'watch':a.data.concern??'other')}`);if(a.kind==='repair')bump(starts,`repair:${w.buildings.find(b=>b.id===a.targetId)?.type??'missing'}`);if(a.kind==='give'||a.kind==='visit'||a.kind==='repair')pending.push({p,a,start:w.tick});},onTransfer:i=>bump(transfers,`${i.reason}:${i.item}`,i.n)};
 const deadline=performance.now()+30_000;
 while(w.tick<start+1200&&performance.now()<deadline){
  if((w.tick-start)%120===0){
   const before=serializeWorld(w);
   for(const p of w.persons.filter(p=>p.alive)){
    personSamples++;
    if(isDependent(w,p)&&(p.needs.hunger<50||p.needs.thirst<46))dependentNeedSamples++;
    if(p.injury||p.illness&&p.illness.severity>=.4)incapacitySamples++;
    const ctx=generateOptions(w,p,true,true);
    const depleted=new Set(Object.values(p.beliefs).filter(b=>sourceKinds.has(b.kind)&&b.amount<=0).map(b=>b.id));
    emptyRememberedSources+=depleted.size;
    damagedSharedKnownSamples+=Object.values(p.beliefs).filter(b=>b.kind==='building'&&b.hh===0&&(b.cond??100)<45).length;
    for(const o of ctx.options){bump(offers,o.kind);if(o.kind==='give'||o.kind==='visit')bump(offers,`${o.kind}:${o.tag}`);if(o.kind==='repair')bump(offers,`repair:${w.buildings.find(b=>b.id===o.targetId)?.type??'missing'}`);if(o.kind==='gather'&&depleted.has(o.targetId??0)){sourceReoffers++;if(estimatedAmount(w,p.beliefs[o.targetId!])<=0)reoffersDespiteEmptyEstimate++;}}
   }
   pure&&=before===serializeWorld(w);
  }
  stepWorld(w);stepWorld(copy);
  for(let i=pending.length-1;i>=0;i--){const t=pending[i];if(t.p.activity===t.a||t.p.suspended===t.a)continue;const r=t.p.lastResult;ends.push({person:t.p.id,start:t.start,kind:t.a.kind,mode:t.a.data.mode,watch:t.a.data.watch,target:t.a.targetId,result:r&&r.tick>=t.start&&r.label===t.a.label?{...r}:null,cycle:t.a.cycle});pending.splice(i,1);}
 }
 const row={seed,source:resolve(path),sourceHash:sha(raw),settings:w.settings,start,end:w.tick,budgetStop:w.tick<start+1200,personSamples,dependentNeedSamples,incapacitySamples,damagedSharedKnownSamples,emptyRememberedSources,sourceReoffers,reoffersDespiteEmptyEstimate,offers,starts,transfers,ends,pending:pending.map(t=>({person:t.p.id,start:t.start,kind:t.a.kind,target:t.a.targetId})),
  repairsConsumed:(w.ledger.reasons['-repairs']??0)-initial.repairs,householdsBefore,householdsAfter:census(),initial,finalPeople:w.persons.filter(p=>p.alive).length,observerPure:pure,continuationEqual:serializeWorld(w)===serializeWorld(copy),conservation:conservationReport(w)};
 rows.push(row);console.log(JSON.stringify({seed,ticks:w.tick-start,samples:personSamples,dependentNeedSamples,incapacitySamples,repairOffers:offers.repair??0,repairStarts:starts.repair??0,careOffers:offers['give:care']??0,careStarts:starts['give:care']??0,pure,continued:row.continuationEqual}));
}
const files=['scripts/programme_checkpoint.ts','src/sim/options_work.ts','src/sim/welfare.ts','src/sim/responsibilities.ts','src/sim/world.ts'];
writeFileSync(join(out,'report.json'),JSON.stringify({head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceHashes:Object.fromEntries(files.map(f=>[f,sha(readFileSync(f,'utf8'))])),question:'Which care/upkeep/depletion opportunities and physical starts occur in the first half-day after the three retained ordinary day-45 checkpoints?',
method:'1200 ticks or 30 seconds per seed. Fixed meadow/river/forest, original rules/settings retained. Offers sampled every 120 ticks for each living person; repeated offers are person-time samples, not unique opportunities. Starts/transfers observed at their actual boundaries. Unobserved restored twin stepped identically.',
limits:'Short rules-53 continuation, not a complete winter/generation, not current rules 54/55, not a benefit comparison. Capable-worker counts are observer diagnostics, never inhabitant knowledge. Starts do not prove completion or downstream use; no fabricated completion or feedback denominator.',rows},null,2));
if(rows.some(r=>!r.observerPure||!r.continuationEqual||!r.conservation.ok))process.exitCode=1;
