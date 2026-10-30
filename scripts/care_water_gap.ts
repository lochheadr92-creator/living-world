// Reproduce the fixed river window to explain its observed failures, without changing choices.
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {serializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {conservationReport} from '../src/sim/economy';
import {CARE_WATER_FAILURE,CARE_BOTH_FAILURE,CARE_PACK_MEMORY,careWaterAvailable} from '../src/sim/care_capacity';
const [out,reference]=process.argv.slice(2).filter(a=>a!=='--');
if(!out||!reference||existsSync(out))throw new Error('Fresh report and original final save required');
const w=createWorld({...currentWorldSettings('normal','river',{immigration:false}),rulesVersion:68}),rows:any[]=[],began=performance.now();
while(w.tick<12000){
 if(w.tick%120===0){
  const before=serializeWorld(w);
  for(const p of w.persons){
   if(!p.alive)continue;
   const failures=Object.entries(p.failures).filter(([,f])=>(f.reason===CARE_WATER_FAILURE||f.reason===CARE_BOTH_FAILURE)&&w.tick-f.tick<CARE_PACK_MEMORY);
   if(!failures.length)continue;
   const ctx=generateOptions(w,p,true,true);
   rows.push({tick:w.tick,person:p.id,name:p.name,needs:p.needs,inv:p.inv,failures,
    knownHomes:Object.values(p.beliefs).filter(b=>b.kind==='building'&&b.hh===p.hhId),
    contacts:failures.map(([id])=>({id:Number(id),where:p.whereabouts[Number(id)],spare:careWaterAvailable(w,p,Number(id))})),
    activity:p.activity,top:rankOptions(ctx).slice(0,5).map(o=>({key:o.key,label:o.label,utility:o.util})),
    careBlocked:ctx.blocked.filter(o=>o.tag==='care').map(o=>({label:o.label,reason:o.blocked}))});
   rows[rows.length-1]=JSON.parse(JSON.stringify(rows[rows.length-1]));
  }
  if(serializeWorld(w)!==before)throw new Error('Diagnostic mutated state');
  if(performance.now()-began>170000)throw new Error('Budget exceeded');
 }
 stepWorld(w);
}
const final=serializeWorld(w),expected=readFileSync(reference,'utf8');
if(final!==expected||!conservationReport(w).ok)throw new Error('Diagnostic changed the original observed continuation');
writeFileSync(out,JSON.stringify({rules:68,seed:'river',tick:w.tick,rows,seconds:(performance.now()-began)/1000,exactOriginalContinuation:true,referenceHash:createHash('sha256').update(expected).digest('hex'),conservation:conservationReport(w)},null,2));
console.log(JSON.stringify(rows.map(r=>({tick:r.tick,name:r.name,water:r.inv.water,contacts:r.contacts,homes:r.knownHomes.map((b:any)=>({id:b.id,type:b.btype})),blocked:r.careBlocked})),null,2));
