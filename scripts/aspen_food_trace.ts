import {readFileSync,writeFileSync} from 'node:fs';
import {DAY} from '../src/sim/constants';
import {foodUnits} from '../src/sim/economy';
import {hashWorld,stepWorld} from '../src/sim/world';
import {setWorkshopErrand} from '../src/sim/workshop_errand';
import {argsOf,worldFromArgs} from './world_args';

const {opt}=argsOf(process.argv), {w,startDay}=worldFromArgs(opt);
const arm=opt('arm',''), reference=JSON.parse(readFileSync(opt('reference',''),'utf8'));
if(w.settings.seed!=='aspen'||startDay!==96||!['on','off'].includes(arm)||arm!==reference.arm||hashWorld(w)!==reference.initial)throw Error('Invalid replay');
setWorkshopErrand(arm==='on');
type Counts=Record<string,number>;
const inc=(m:Counts,k:string,n=1)=>{m[k]=(m[k]??0)+n;};
const previous=new Map<number,number>(), cause=new Map<number,string>();
const origin=new Set(w.persons.filter(p=>p.alive).map(p=>p.id));
const triggerTicks:Counts={}, episodes:Counts={}, hhFlows:Counts={}, hhNutrition:Counts={}, groups:Counts={};
let awake=0,short=0;
w.hooks={
 onNourishment(p,e){if(e.kind==='meal'){inc(hhNutrition,p.hhId+'|portions');inc(hhNutrition,p.hhId+'|nutrition',e.input);}},
 onTransfer(e){
   if(!foodUnits({[e.item]:1}))return;
   for(const [direction,tag] of [['in',e.to],['out',e.from]]){
     const [type,id]=tag.split(':');
     if(type!=='building')continue;
     const b=w.byId.get(Number(id));
     if(b?.ent==='building' && w.households.some(h=>h.id===b.hhId && h.homeId===b.id))
       inc(hhFlows,[b.hhId,direction,e.reason,e.item].join('|'),e.n);
   }
 }
};
for(let day=0;day<13;day++){
 for(let t=0;t<DAY;t++){
   const homes=new Map(w.households.map(h=>[h.id,w.byId.get(h.homeId)]));
   for(const p of w.persons){
     if(!p.alive)continue;
     const home=homes.get(p.hhId);
     const mask=(p.needs.hunger<62?1:0)|(foodUnits(p.inv)===0?2:0)|(home?.ent!=='building'||foodUnits(home.store.items)===0?4:0);
     const prev=previous.get(p.id);
     if(mask===7 && prev!==7){
       const changed=prev===undefined?[]:['hunger threshold','pack emptied','home empty'].filter((_,i)=>!(prev&(1<<i)));
       const why=changed.join(' + ')||'first observation';
       cause.set(p.id,why);inc(episodes,why);
     }
     previous.set(p.id,mask);
     if(p.pose==='sleep')continue;
     awake++;
     const group=origin.has(p.id)?'starting residents':'later residents';
     inc(groups,group+'|awake');
     if(mask===7){short++;inc(triggerTicks,cause.get(p.id)!);inc(groups,group+'|short');}
   }
   stepWorld(w);
 }
 console.log('day '+(day+97));
}
if(hashWorld(w)!==reference.endHash||awake!==reference.awake||short!==reference.hungryNoFood)throw Error('Replay mismatch');
writeFileSync(opt('out',''),JSON.stringify({arm,awake,short,triggerTicks,episodes,hhFlows,hhNutrition,groups},null,1));

