import {readFileSync,writeFileSync} from 'node:fs';
import {DAY} from '../src/sim/constants';
import {ageYears} from '../src/sim/people';
import {foodUnits,conservationReport} from '../src/sim/economy';
import {hashWorld,stepWorld} from '../src/sim/world';
import type {Activity,Person} from '../src/sim/types';
import type {Ctx,Option} from '../src/sim/optutil';
import {setWorkshopErrand} from '../src/sim/workshop_errand';
import {argsOf,worldFromArgs} from './world_args';

const {opt}=argsOf(process.argv),arm=opt('arm','');
const {w,startDay}=worldFromArgs(opt);
if(w.settings.seed!=='aspen'||startDay!==96||!['on','off','only','except'].includes(arm))throw Error('Invalid arm or start');
const hh=1091, events:unknown[][]=[],stats:Record<string,number>={};
const event=(...row:unknown[])=>events.push([w.tick,...row]);
const inc=(k:string,n=1)=>{stats[k]=(stats[k]??0)+n;};
const restored=new WeakSet<Option>();
Object.assign(globalThis,{
 lindenEnabled:(id:number)=>arm==='on'||(arm==='only'&&id===hh)||(arm==='except'&&id!==hh),
 lindenRestored:restored,
 lindenReview:(p:Person,a:Activity,ctx:Ctx,ranked:Option[])=>{
   const alt=ranked.find(o=>!restored.has(o));
   event('review',p.id,a.id,a.goal,alt?.key,alt?.goal,alt?.tag,ranked.filter(o=>o.tag==='care').map(o=>o.key),ctx.options.some(o=>!restored.has(o)&&o.key===a.data.optKey));
 }
});
setWorkshopErrand(arm!=='off');
const house=()=>w.households.find(h=>h.id===hh)!;
const members:Record<number,string>={};
w.hooks={
 onTransfer(e){
   if(!foodUnits({[e.item]:1}))return;
   const ids=[e.from,e.to];
   if(ids.includes('building:'+house().homeId)||ids.some(tag=>tag.startsWith('person:')&&w.byId.get(+tag.slice(7))?.ent==='person'&&w.persons.some(p=>p.id===+tag.slice(7)&&p.hhId===hh)))
      event('food',e.from,e.to,e.reason,e.item,e.n,house().homeId);
 },
 onActivityEnd(p,a,result,detail){if(p.hhId===hh)event('end',p.id,a.id,a.kind,a.goal,result,detail,a.targetId);},
 onActivityStart(p,a){if(p.hhId===hh)event('start',p.id,a.id,a.kind,a.goal,a.data.optKey,a.targetId,a.data.inputRecipe);},
 onNourishment(p,e){if(p.hhId===hh&&e.kind==='meal')event('meal',p.id,ageYears(w,p),e.input,p.activity?.kind,p.needs.hunger);}
};
const short=new Set<number>();
for(let day=0;day<13;day++){
 for(let t=0;t<DAY;t++){
   const h=house(),home=w.byId.get(h.homeId);
   for(const p of w.persons){
     if(p.hhId!==hh||!p.alive)continue;
     members[p.id]=p.name;
     const child=ageYears(w,p)<12;
     const hungry=p.pose!=='sleep'&&p.needs.hunger<62;
     const noFood=hungry&&!foodUnits(p.inv)&&(home?.ent!=='building'||!foodUnits(home.store.items));
     if(noFood!==short.has(p.id)){event(noFood?'short':'clear',p.id);if(noFood)short.add(p.id);else short.delete(p.id);}
     if(p.pose!=='sleep'){
       inc(p.id+'|awake');if(noFood)inc(p.id+'|short');
       if(child){inc(p.id+'|childAwake');if(noFood)inc(p.id+'|childShort');}
     }
   }
   stepWorld(w);
 }
 console.log('completed '+(day+97));
}
const endHash=hashWorld(w),check=conservationReport(w).ok;
if(!check)throw Error('Conservation');
if(['on','off'].includes(arm)){
 const ref=JSON.parse(readFileSync('review_evidence/winter259/aspen-day96-'+arm+'.json','utf8'));
 if(endHash!==ref.endHash)throw Error('End hash mismatch');
}
writeFileSync(opt('out',''),JSON.stringify({arm,endHash,check,members,stats,events}));


