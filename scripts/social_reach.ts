import {readFileSync,writeFileSync} from 'node:fs';
import {hashWorld,stepWorld} from '../src/sim/world';
import {DAY} from '../src/sim/constants';
import {goalNudge} from '../src/sim/life';
import {conservationReport} from '../src/sim/economy';
import {argsOf,worldFromArgs} from './world_args';
import type {Ctx,Option} from '../src/sim/optutil';
import type {Activity} from '../src/sim/types';

const {opt}=argsOf(process.argv),{w,startDay}=worldFromArgs(opt);
const ref=JSON.parse(readFileSync('review_evidence/choice-funnel/'+w.settings.seed+'-final.json','utf8'));
if(startDay!==96 || hashWorld(w)!==ref.start)throw Error('Unexpected start');
const scores=new WeakMap<Ctx,Map<Option,number>>();
const names=['visit','explore','gather','continuingCompany','invite','host','attend','ownHope'] as const;
type Counts=Record<string,number>;
const counts:Counts={},losses:Counts={},details:Counts={},outcomes:Counts={};
const inc=(map:Counts,key:string,n=1)=>{map[key]=(map[key]??0)+n;};
const matches=(ctx:Ctx,o:Option,group:string)=>{
  switch(group){
    case 'ownHope':return goalNudge(w,ctx.p,o)>0;
    case 'continuingCompany':return o.parts.some(([name])=>name==='make time for continuing company');
    case 'invite':return o.key.includes(':invite') && o.kind==='socialize';
    case 'host':return o.kind==='host_meal';
    case 'attend':return o.kind==='attend_meal';
    default:return o.kind===group;
  }
};
const active=new Map<number,string[]>();
const named:Counts={};
Object.assign(globalThis,{
 agencyScores(ctx:Ctx,raw:{o:Option;s:number}[]){scores.set(ctx,new Map(raw.map(r=>[r.o,r.s])));},
 agencyChoice(ctx:Ctx,ranked:Option[],chosen:Option|null,a:Activity|null){
   inc(counts,'decisions');
   const groups:string[]=[];
   const ines=w.settings.seed==='river' && ctx.p.id===1125;
   if(ines)inc(named,'decisions');
   for(const group of names){
     const match=(o:Option)=>matches(ctx,o,group);
     if(ctx.options.some(match))inc(counts,group+'|generated');
     if(ines && group==='ownHope'){
       if(ranked.some(match))inc(named,'ranked');
       if(chosen && match(chosen))inc(named,'chosen');
       else if(ranked.some(match) && chosen)inc(named,'lost|'+chosen.kind);
     }
     const rank=ranked.findIndex(match);
     if(rank>=0){
       inc(counts,group+'|ranked');
       if(rank<30)inc(counts,group+'|top30');
       if(rank<5)inc(counts,group+'|top5');
     }
     if(chosen && a && match(chosen)){
       groups.push(group);inc(counts,group+'|chosen');inc(details,group+'|'+chosen.kind+'|'+chosen.tag+'|'+chosen.key.split(':')[0]);
     }else if(rank>=0 && chosen){
       inc(losses,[group,chosen.kind,chosen.need??'none'].join('|'));
       const m=scores.get(ctx),best=m?.get(ranked[rank]),winner=m?.get(chosen);
       if(best!==undefined&&winner!==undefined){inc(counts,group+'|marginSum',winner-best);inc(counts,group+'|marginN');}
     }
   }
   if(a && groups.length)active.set(a.id,groups);
 }
});
w.hooks={
 onActivityStart(p,a){for(const g of active.get(a.id)??[])inc(counts,g+'|started');},
 onActivityEnd(p,a,outcome,detail){
   for(const g of active.get(a.id)??[]){inc(counts,g+'|'+outcome);inc(outcomes,g+'|'+outcome+'|'+detail);}
   active.delete(a.id);
 }
};
const meals=new Map<number,object>();
const baselineMeals=new Set(w.meals.map(m=>m.id));
function sampleMeals(){
  for(const m of w.meals)meals.set(m.id,{initial:baselineMeals.has(m.id),host:m.host,created:m.created,at:m.at,
    invited:m.invited.length,accepted:m.accepted.length,arrived:m.arrived.length,ate:m.ate.length,status:m.status,end:m.end});
}
function company(){
  const result=new Map<string,{days:number;last:number;helped:number}>();
  for(const p of w.persons)if(p.alive)for(const [id,r] of Object.entries(p.relations)){
    if(r.company)result.set(p.id+'/'+id,{days:r.company.days,last:r.company.last,helped:r.company.helped});
  }
  return result;
}
const before=company();
sampleMeals();
for(let i=0;i<DAY;i++){stepWorld(w);sampleMeals();}
const after=company();
const updates=[...after].filter(([id,r])=>r.last>(before.get(id)?.last??-1)||r.helped>(before.get(id)?.helped??0));
const end=hashWorld(w),conservation=conservationReport(w).ok;
if(end!==ref.end||!conservation)throw Error('Replay verification failed');
writeFileSync(opt('out',''),JSON.stringify({end,conservation,counts,losses,details,outcomes,named,company:{
 atStart:before.size,atEnd:after.size,changedAtEnd:updates.length,repeatUpdates:updates.filter(([,r])=>r.days>=2).length,
 helpedUpdates:updates.filter(([id,r])=>r.helped>(before.get(id)?.helped??0)).length},meals:[...meals.values()]},null,1));

