import {textileProtection,TEXTILES,hasClothing} from '../../src/sim/clothing';
import {demandsOf} from '../../src/sim/production';
import {batchWanted} from '../../src/sim/batch_plan';
import {stageOf} from '../../src/sim/people';
import type {World} from '../../src/sim/types';
import type {Ctx,Option} from '../../src/sim/optutil';

/** Bounded diagnostic evidence, never simulation state or instructions. */
export function clothingObserver(w:World){
 const counts:Record<string,number>={},stories:unknown[]=[],last=new Map<number,number>();
 const inc=(key:string,n=1)=>counts[key]=(counts[key]??0)+n;
 return {
  tick(){
   if(!hasClothing(w))return;
   for(const t of w.tools){if(!t.textile)continue;const p=w.byId.get(t.holder);if(p?.ent!=='person'||!p.alive)continue;
    const heat=textileProtection(p,t);if(heat<=0)continue;
    inc(`protected ticks:${t.kind}:${stageOf(w,p)}`);inc(`degree ticks:${t.kind}:${stageOf(w,p)}`,heat);
   }
  },
  sample(ctx:Ctx,ranked:Option[]){
   if(!hasClothing(w))return;
   const wanted=demandsOf(ctx).filter(d=>['fibre',...TEXTILES].includes(String(d.item)));
   for(const d of wanted)inc('wanted:'+d.item);
   const match=(o:Option)=>/fibre|garment|blanket|bedding|^dress:|^clothe_child:/.test(o.key+' '+o.label);
   const offered=ctx.options.filter(match),blocked=ctx.blocked.filter(match);
   for(const o of offered)inc('offered:'+o.key.split(':').at(-1));
   for(const o of blocked)inc('blocked:'+o.label+':'+o.blocked);
   const day=Math.floor(w.tick/2400),p=ctx.p;
   if(stories.length>=240||last.get(p.id)===day||!wanted.length||!(p.inv.garment||p.inv.fibre||offered.some(o=>ranked[0]?.key===o.key)))return;
   last.set(p.id,day);
   const batch=batchWanted(ctx);
   stories.push({tick:w.tick,person:p.id,age:ctx.stage,pack:{...p.inv},needs:{...p.needs},wanted,batch:batch?{item:batch.item,recipe:batch.recipe}:null,
    plans:p.intentions.filter(i=>i.status==='active').map(i=>({kind:i.kind,makes:i.makes,step:i.step,blocked:i.blocked})),
    ranked:ranked.slice(0,3).map(o=>({key:o.key,utility:o.util})),offered:offered.map(o=>({key:o.key,utility:o.util})),blocked:blocked.map(o=>({label:o.label,reason:o.blocked}))});
  },
  report(){return {counts,stories,limits:'Repeated samples are not independent opportunities. Stories are bounded to 240 snapshots and one per person/day. Protection counts are actual positive item contributions.'};},
 };
}
