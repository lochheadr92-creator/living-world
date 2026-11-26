import {writeFileSync} from 'node:fs';
import type {Ctx,Option} from '../src/sim/optutil';
import type {Activity} from '../src/sim/types';
import {hashWorld,stepWorld} from '../src/sim/world';
import {conservationReport} from '../src/sim/economy';
import {DAY} from '../src/sim/constants';
import {argsOf,worldFromArgs} from './world_args';
const {opt}=argsOf(process.argv),{w,startDay}=worldFromArgs(opt);
if(startDay!==96 || w.settings.rulesVersion!==266 || !w.settings.immigration)throw Error('Unexpected start');
const watched=opt('observe','on')==='on';
const counts:Record<string,number>={}, losses:Record<string,number>={},details:Record<string,number>={};
function add(map:Record<string,number>,key:string,n=1){map[key]=(map[key]??0)+n;}
function group(o:Option){
 if(o.kind==='explore')return 'exploration';
 if(['wander','alone'].includes(o.kind)||o.tag==='leisure')return 'leisure';
 if(o.need && o.need!=='social' || ['flee','defend','rest','sleep','eat','drink','warm','eat_store'].includes(o.kind))return 'survival';
 if(o.need==='social'||['visit','attend','socialize','converse','attend_meal','host_meal','argue','pay_respects'].includes(o.kind))return 'social';
 return 'work_other';
}
const scores=new WeakMap<Ctx,Map<Option,number>>();
const selected=new Map<number,{g:string,social:number,partner:boolean}>();
const follow=new Map<number,{g:string,id:number,social:number}[]>();
if(watched){
 Object.assign(globalThis,{
  partnerGate:(gate:string)=>add(counts,'partner|'+gate),
  choiceScores:(ctx:Ctx,rows:{o:Option,s:number}[])=>scores.set(ctx,new Map(rows.map(r=>[r.o,r.s]))),
  choiceLaunch:(ctx:Ctx,ranked:Option[],chosen:Option|null,act:Activity|null)=>{
   add(counts,'decisions');
   const partner=(o:Option)=>o.kind==='socialize' && ['to become a couple','to share a household'].includes(o.goal) && o.tag==='household';
   if(ctx.options.some(partner))add(counts,'proposal|generated');if(ranked.some(partner))add(counts,'proposal|ranked');
   for(const [stage,opts] of [['generated',ctx.options],['ranked',ranked],['top30',ranked.slice(0,30)],['top5',ranked.slice(0,5)]] as const){
    const groups=new Set<string>();
    for(const o of opts){groups.add(group(o));add(counts,group(o)+'|'+stage+'Options');}
    for(const g of groups)add(counts,g+'|'+stage);
   }
   for(const g of ['social','leisure','exploration']){
    const best=ranked.find(o=>group(o)===g);
    if(best&&chosen&&group(chosen)!==g){
     add(losses,g+'|'+group(chosen));
     const m=scores.get(ctx)!;
     add(counts,g+'|margin',m.get(chosen)!-m.get(best)!);
     add(counts,g+'|loss');
    }
   }
   if(chosen&&act){const g=group(chosen);add(counts,g+'|chosen');add(details,[g,chosen.kind,chosen.tag].join('|'));selected.set(act.id,{g,social:ctx.p.needs.social,partner:partner(chosen)});}
  }
 });
 w.hooks={
  onActivityStart(p,a){const row=selected.get(a.id);if(row){add(counts,row.g+'|started');if(row.partner)add(counts,'proposal|started');}},
  onActivityEnd(p,a,outcome){const row=selected.get(a.id);if(!row)return;
   if(row.partner)add(counts,'proposal|'+outcome);add(counts,row.g+'|'+outcome);selected.delete(a.id);
   if(outcome==='success'&&['social','leisure'].includes(row.g)){
    const tick=w.tick+120;
    const obs=follow.get(tick)??[];obs.push({g:row.g,id:p.id,social:row.social});follow.set(tick,obs);
   }
  }
 };
}
const start=hashWorld(w);
for(let t=0;t<DAY;t++){
 for(const obs of follow.get(w.tick)??[]){
  const p=w.byId.get(obs.id);
  if(p?.ent==='person'&&p.alive){add(counts,obs.g+'|followed');add(counts,obs.g+'|socialDelta120',p.needs.social-obs.social);}
 }
 follow.delete(w.tick);stepWorld(w);
}
for(const {g} of selected.values())add(counts,g+'|open');
writeFileSync(opt('out',''),JSON.stringify({start,end:hashWorld(w),conservation:conservationReport(w).ok,watched,counts,losses,details},null,1));



