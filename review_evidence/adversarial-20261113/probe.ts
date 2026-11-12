// Staged adversarial probes; no production code changes or ordinary-world outcome claims.
import { createWorld } from '../../src/sim/factory';
import { freshRunSettings } from '../../src/sim/profiles';
import { serializeWorld, deserializeWorld } from '../../src/app/save';
import { suspendActivity, resumeSuspended } from '../../src/sim/activities';
import { workComesFirst } from '../../src/sim/parent_decides';
import { toldKey, tellingSuppressed } from '../../src/sim/empty_news';
import { waterBeliefId, isWaterBeliefId, observe } from '../../src/sim/knowledge';
import { dissolveHousehold } from '../../src/sim/households';
import { newId } from '../../src/sim/registry';
import { stageOf } from '../../src/sim/people';
const make = () => createWorld({ ...freshRunSettings('rich', 'normal', 'aspen', { immigration: true }), rulesVersion: 228 });
const out: Record<string, unknown> = {};
{
 const w=make(); const p=w.persons.find(p=>p.alive)!;
 w.nextId=p.id;
 try {const loaded=deserializeWorld(serializeWorld(w));out.saveCounter={accepted:true,nextId:loaded.nextId,allocated:newId(loaded),existingPerson:p.id};}catch(e){out.saveCounter={accepted:false,error:String(e)};}
}
{
 const w=make();const p=w.persons.find(p=>p.alive)!; const child=w.persons.find(p=>p.alive&&stageOf(w,p)==='child')!;
 const job={kind:'gather',label:'Gathering berries',phase:'work',progress:39,pprogress:39,duration:40,utility:999,start:w.tick,expire:w.tick+5000,claims:[],path:[],pi:0,pathTries:0,targetId:w.sources[0].id,targetType:'source',data:{}} as any;
 p.activity=job;const before=job.progress;suspendActivity(w,p);const refusal=workComesFirst(w,p,child);const resumed=resumeSuspended(w,p);
 out.refusedAsk={before,after:job.progress,phase:job.phase,refusal,resumed};
}
{
 const w=make();const p=w.persons.find(p=>p.alive)!;w.tick=100;
 const water=waterBeliefId(12), source=12, listener=100;
 p.told[toldKey(listener,water)]=w.tick;
 out.deliveryCollision={waterKey:toldKey(listener,water),otherKey:toldKey(listener+1,source),suppressedUntold:tellingSuppressed(w,p,listener+1,{id:source,kind:'berry_bush',amount:3,seen:100} as any)};
 const s=w.sources[0]; s.id=water;observe(w,p,s);
 out.entityWaterCollision={id:s.id,kind:p.beliefs[s.id]?.kind,classedAsWater:isWaterBeliefId(s.id)};
}
{
 const w=make();const initial=w.households.length;const hh=w.households[0];hh.members=[];dissolveHousehold(w,hh);
 out.householdsEver={before:initial,after:w.households.length,explanation:'generation_trace householdsEver reads this shrinking array length'};
}
console.log(JSON.stringify(out,null,2));
