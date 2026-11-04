// ORDINARY diagnosis (hooks and read-only log scan): goods hand-overs that fail for lack of room, their recovery, and
// whether the intended recipient later takes food from a care store. Normal, arrivals on, rules pinned.
// Usage: vite-node <this> <seed> <rules> <days> <out.json>
import {writeFileSync} from 'node:fs';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport,roomFor,weightOf} from '../../src/sim/economy';
import {carryCap,stageOf} from '../../src/sim/people';
import {freeInv} from '../../src/sim/intent';
import {isFoodKind} from '../../src/sim/provision';
import {DAY} from '../../src/sim/constants';
import type {Items,ItemKind,Person} from '../../src/sim/types';
const [seed='meadow',rulesArg='156',daysArg='10',out='exchange-room.json']=process.argv.slice(2);
const w=createWorld({...currentWorldSettings('normal',seed),rulesVersion:Number(rulesArg)});
const twin=deserializeWorld(serializeWorld(w));
const byId=(id:number)=>w.persons.find(p=>p.id===id);
const load=(p:Person)=>({inv:{...p.inv},weight:weightOf(p.inv),cap:carryCap(w,p),free:freeInv(p),stage:stageOf(w,p),hunger:Math.round(p.needs.hunger)});
const count:Record<string,number>={};const inc=(k:string)=>{count[k]=(count[k]??0)+1;};
const hadFoodAt=new Map<string,number>(),seenAt:unknown[]=[];const failures:unknown[]=[],lastFail=new Map<string,number>();
const stores:{tick:number;giver:number;to:number;b:number;items:Items;took:number;tookTick:number|null;ateAtHome:number}[]=[];
const surplusFor=(q:Person,k:ItemKind)=>{const f=freeInv(q);let s=0;for(const j of Object.keys(f) as ItemKind[])if(j!==k)s+=(f[j]??0);return s;};
function fail(kind:string,giver:Person,to:Person,items:Items){
 const k=(Object.keys(items) as ItemKind[])[0];const pair=`${giver.id}>${to.id}`;const prev=lastFail.get(pair);
 const giverHas=(Object.keys(items) as ItemKind[]).some(j=>(giver.inv[j]??0)>0),room=k?roomFor(to.inv,carryCap(w,to),k):0;
 const cause=!giverHas?'giver lacked goods':room<1?'recipient no room':'other';inc(kind+':detail:'+(giver.lastResult?.detail??''));
 inc(`${kind}:fail:${cause}`);if(prev!==undefined&&w.tick-prev<600)inc(`${kind}:repeat within 600 of a failure`);lastFail.set(pair,w.tick);
 if(failures.length<40)failures.push({tick:w.tick,kind,cause,giver:{id:giver.id,name:giver.name,...load(giver)},to:{id:to.id,name:to.name,sameHh:to.hhId===giver.hhId,...load(to),unreservedOther:k?surplusFor(to,k):0},items,repeatOfFailureAt:prev??null});
}
w.hooks={
 onActivityEnd(p,a,outcome,detail){
  if(a.kind==='give'){const to=byId(a.targetId);const path=a.data.residentCare?'resident':'roaming';inc(`give(${a.data.mode??'give'}):${outcome}`);if(outcome==='failed')inc(`path:${path}:${detail.replace(/^[A-Z][a-z]+ /,'X ')}`);if(outcome==='failed'&&detail==='they already have food with them'){const pk=`${p.id}>${a.targetId}`;const prev=hadFoodAt.get(pk);if(prev!==undefined&&w.tick-prev<600)inc(`path:${path}:had-food again within 600`);hadFoodAt.set(pk,w.tick);if(seenAt.length<30)seenAt.push({tick:w.tick,path,label:a.label,prev:prev??null,inSightAtStart:!!a.data.inSight});}if(to&&outcome==='failed')fail(`give(${a.data.mode??'give'})`,p,to,(a.data.items??{}) as Items);}
  if(a.kind==='deposit'&&a.data.careStore){inc(`careStore:${outcome}:${detail}`);if(outcome==='success')stores.push({tick:w.tick,giver:p.id,to:a.data.careRecipient as number,b:a.targetId,items:{...(a.data.items as Items)},took:0,tookTick:null,ateAtHome:0});}
 },
 onActivityStart(p,a){if(a.kind==='eat_store')for(const s of stores)if(s.to===p.id&&a.targetId===s.b&&w.tick-s.tick<2400)s.ateAtHome++;},
 onTransfer(info){
  for(const s of stores)if(info.from==='building:'+s.b&&info.to==='person:'+s.to&&isFoodKind(info.item)&&w.tick-s.tick<2400){s.took+=info.n;if(s.tookTick===null)s.tookTick=w.tick;}
 },
};
// The offer receipt is logged on both sides (social.ts 'offer'); read the giver's newest entries, never writing.
const seen=new Map<number,number>();
const end=Number(daysArg)*DAY;
const kid={samples:0,sum:0,below25:0,below10:0,deaths:0};
while(w.tick<end){stepWorld(w);stepWorld(twin);
 if(w.tick%60===0)for(const q of w.persons){if(!q.alive||stageOf(w,q)!=='child')continue;kid.samples++;kid.sum+=q.needs.hunger;if(q.needs.hunger<25)kid.below25++;if(q.needs.hunger<10)kid.below10++;}
 for(const p of w.persons){const L=p.log;if(!L?.length)continue;const from=seen.get(p.id)??-1;
  for(let i=L.length-1;i>=0&&L[i].tick>from;i--){const t=L[i].text;const m=/^(.+): (No goods changed hands|Received .*)\.$/.exec(t);if(!m||L[i].kind!=='social')continue;
   const to=w.persons.find(q=>q.name===m[1]&&q.alive);if(!to)continue;
   if(m[2].startsWith('No goods'))fail('offer',p,to,((p.activity?.data?.conv as {items?:Items}|undefined)?.items)??{});else inc(/could not be handed over/.test(t)?'offer:partial':'offer:received');}
  seen.set(p.id,L[L.length-1].tick);}
}
delete w.hooks;
kid.deaths=w.deceased.filter(d=>(d.age??99)<12).length;
const res={seed,kid:{...kid,mean:kid.sum/Math.max(1,kid.samples)},rules:w.settings.rulesVersion,days:Number(daysArg),exactTwin:serializeWorld(w)===serializeWorld(twin),conserved:conservationReport(w).ok,alive:w.persons.filter(p=>p.alive).length,count,
 hadFoodCases:seenAt,careStores:stores.map(s=>({...s,delay:s.tookTick===null?null:s.tookTick-s.tick})),failures};
writeFileSync(out,JSON.stringify(res,null,1));
console.log(JSON.stringify({seed,kid:res.kid,exactTwin:res.exactTwin,conserved:res.conserved,alive:res.alive,count,careStores:res.careStores.length,recipientTook:res.careStores.filter(s=>s.took>0).length}));
