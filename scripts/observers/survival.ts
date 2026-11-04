import {PRESERVED_FOODS} from '../../src/sim/constants';
import {RECIPE_BY_ID} from '../../src/sim/recipes';
import {preservationSurplus} from '../../src/sim/production';
import {stageOf} from '../../src/sim/people';
import {shelterAt,fireWarmth} from '../../src/sim/needs';
import type {Ctx,Option} from '../../src/sim/optutil';
import type {World} from '../../src/sim/types';

/** Observer-only counters. Never assign actions, write simulation state or draw RNG. */
export function survivalObserver(w:World){
  const counts:Record<string,number>={};
  const inc=(k:string,n=1)=>counts[k]=(counts[k]??0)+n;
  const previous=w.hooks;
  const observed=new Set<string>();
  const decisions:unknown[]=[];
  const chainDecisions:unknown[]=[];
  const lastChainDay=new Map<number,number>();
  const sampledPeople=new Set<string>();
  const coldEpisodes:unknown[]=[];
  const lastCold=new Map<number,number>();
  const fittingSites=new Set<number>();
  const hearthRelated=(a:{data:Record<string,any>;targetId?:number})=>a.data.improvement==='hearth'||a.data.hearth===true||!!a.targetId&&fittingSites.has(a.targetId);
  const related=(a:{kind:string;targetId?:number;goal?:string;label?:string})=>
    /keep spare food|preserv/i.test((a.goal??'')+' '+(a.label??''))||
    ['operate','deposit','withdraw'].includes(a.kind)&&w.buildings.some(b=>b.id===a.targetId&&b.type==='food_rack');
  w.hooks={...previous,
    onActivityStart(p,a){
      previous?.onActivityStart?.(p,a);
      if(related(a))inc(`chain starts:${a.kind}`);
      if(hearthRelated(a))inc(`hearth starts:${a.kind}`);
      if(a.kind==='hunt')inc('hunting pursuits started');
      if(a.kind==='operate'&&RECIPE_BY_ID[String(a.data.recipe)]?.preservation)inc(`starts:${a.data.recipe}`);
      if(a.kind==='plan_site'&&a.data.type==='food_rack')inc('starts:rack layout');
    },
    onActivityEnd(p,a,outcome,detail){
      previous?.onActivityEnd?.(p,a,outcome,detail);
      if(related(a))inc(`chain ends:${a.kind}:${outcome}:${detail}`);
      if(hearthRelated(a))inc(`hearth ends:${a.kind}:${outcome}:${detail}`);
      if(a.kind==='hunt'){
        inc(`hunting ends:${outcome}:${detail}`);
        const tries=Number(a.data.tries??0);
        if(tries>0){inc('hunting actual strikes',tries);inc(outcome==='success'?'hunting kills':'hunting failed strikes');}
      }
      if(a.kind==='operate'&&RECIPE_BY_ID[String(a.data.running??a.data.recipe)]?.preservation)inc(`ends:${outcome}:${detail}`);
      if(a.kind==='plan_site'&&a.data.type==='food_rack')inc(`rack layout ends:${outcome}:${detail}`);
    },
    onTransfer(info){
      previous?.onTransfer?.(info);
      if(PRESERVED_FOODS.includes(info.item as typeof PRESERVED_FOODS[number]))inc(`transfer:${info.item}:${info.reason}`,info.n);
      if(info.item==='fish'&&info.to.startsWith('building:')&&w.byId.get(Number(info.to.split(':')[1]))?.ent==='building')inc('fish delivered to buildings',info.n);
      if(info.to.startsWith('building:')&&w.buildings.some(b=>b.id===Number(info.to.split(':')[1])&&b.type==='food_rack'))inc(`delivered to rack:${info.item}`,info.n);
    },
  };
  return {
    sample(ctx:Ctx,ranked:Option[]=[]){
      inc('sampled personally visible deer',ctx.p.seen.filter(s=>s.ent==='animal'&&ctx.world.byId.get(s.id)?.ent==='animal'&&(ctx.world.byId.get(s.id) as {type?:string}).type==='deer').length);
      inc('sampled eligible hunt offers',ctx.options.filter(o=>o.kind==='hunt').length);
      for(const o of ctx.options)if(o.key.startsWith('hearth_'))inc(`sampled hearth offers:${o.kind}`);
      const raw=preservationSurplus(ctx);
      if(raw&&ctx.stage!=='child')inc(`sampled known surplus:${raw}`);
      for(const o of ctx.options)if(o.key==='plan_site:food_rack')inc('sampled offers:rack layout');
      for(const o of ctx.options)if(o.kind==='operate'&&/Drying|Smoking/.test(o.label))inc(`sampled offers:${o.label}`);
      for(const o of ctx.options)if(related(o))inc(`sampled chain offers:${o.kind}`);
      for(const o of ctx.blocked)if(/drying|smoking|preserv/i.test(o.label))inc(`sampled blocks:${o.blocked}`);
      const offers=ctx.options.filter(related),blocked=ctx.blocked.filter(related);
      const day=Math.floor(w.tick/2400);
      if((offers.length||blocked.length)&&lastChainDay.get(ctx.p.id)!==day){
        lastChainDay.set(ctx.p.id,day);
        chainDecisions.push({tick:w.tick,person:ctx.p.id,pack:{...ctx.p.inv},needs:{...ctx.p.needs},
          plans:ctx.p.intentions.filter(i=>i.status==='active').map(i=>({kind:i.kind,step:i.stepKey,blocked:i.blocked})),
          offers:offers.map(o=>({key:o.key,utility:o.util})),blocked:blocked.map(o=>({key:o.key,reason:o.blocked})),
          best:ranked.slice(0,3).map(o=>({key:o.key,utility:o.util}))});
        if(chainDecisions.length>64)chainDecisions.shift();
      }
      const key=`${ctx.p.id}:${Math.floor(w.tick/2400)}`;
      if(raw&&ctx.stage!=='child'&&decisions.length<24&&!sampledPeople.has(key)){
        sampledPeople.add(key);decisions.push({tick:w.tick,person:ctx.p.id,raw,pack:{...ctx.p.inv},needs:{...ctx.p.needs},
          best:ranked.slice(0,3).map(o=>({key:o.key,utility:o.util})),
          preservation:ctx.options.filter(o=>/food_rack|dry_fish|smoke_fish|dry_meat|smoke_meat/.test(o.key)).map(o=>({key:o.key,utility:o.util}))});
      }
    },
    tick(){
      for(const s of w.sites)if(s.improvement==='hearth')fittingSites.add(s.id);
      for(const p of w.persons)if(p.alive){
        if(p.activity&&hearthRelated(p.activity))inc(`hearth person ticks:${p.activity.kind}:${p.activity.phase}`);
        const b=p.indoors?w.byId.get(p.indoors):null;
        if(b?.ent==='building'&&b.hearth&&b.hearth.heat>0){inc('hearth heated occupant ticks');inc('hearth occupant degree-ticks',b.hearth.heat);}
        if(p.needs.warmth<=6){
          const age=stageOf(w,p);inc(`exposure ticks:${age}`);
          if(age==='child'&&w.tick-(lastCold.get(p.id)??-2400)>=2400){
            lastCold.set(p.id,w.tick);
            coldEpisodes.push({tick:w.tick,person:p.id,health:p.health,needs:{...p.needs},x:p.x,y:p.y,indoors:p.indoors??null,activity:p.activity?{kind:p.activity.kind,phase:p.activity.phase,target:p.activity.targetId}:null,
              shelter:shelterAt(w,p.x,p.y,p),fire:p.indoors?0:fireWarmth(w,p.x,p.y),hearth:b?.ent==='building'?b.hearth:null,
              household:w.persons.filter(q=>q.alive&&q.hhId===p.hhId&&q!==p).map(q=>({id:q.id,stage:stageOf(w,q),x:q.x,y:q.y,needs:{...q.needs},action:q.activity?.kind,target:q.activity?.targetId}))});
            if(coldEpisodes.length>48)coldEpisodes.shift();
          }
        }
      }
      for(const p of w.persons)if(p.alive&&p.activity&&related(p.activity))inc(`chain person ticks:${p.activity.kind}:${p.activity.phase}`);
      for(const b of w.buildings){
        const j=b.ops?.job;
        if(!j||!RECIPE_BY_ID[j.recipe]?.preservation)continue;
        const key=`${b.id}:${j.started}:${j.phase}`;
        if(!observed.has(key)){
          observed.add(key);inc(`batches:${j.recipe}:${j.phase}`);
          if(j.phase==='burn')for(const [fuel,n] of Object.entries(RECIPE_BY_ID[j.recipe].fuel))inc(`fuel paid:${fuel}`,n);
        }
      }
    },
    report(){return {counts,decisions,chainDecisions,coldEpisodes,racks:w.buildings.filter(b=>b.type==='food_rack').length,
      hearths:w.buildings.filter(b=>b.hearth).length,hearthFuelConsumed:w.ledger.reasons['-fuel for indoor hearth']??0,
      made:Object.fromEntries(PRESERVED_FOODS.map(k=>[k,w.ledger.created[k]??0])),
      consumed:Object.fromEntries(PRESERVED_FOODS.map(k=>[k,w.ledger.consumed[k]??0])),
      spoiled:Object.fromEntries(PRESERVED_FOODS.map(k=>[k,w.ledger.spoiled[k]??0])),
      unfinishedSpoiled:w.ledger.reasons['xunfinished preservation spoiled']??0,
      unfinishedDestroyed:w.ledger.reasons['xunfinished preservation destroyed with rack']??0,
      limits:'Offers and blocks are repeated samples; starts are activities, work/burn/ready are unique batch phases. Consumed preserved food is actual ledger consumption, not production or possession.'};},
  };
}
