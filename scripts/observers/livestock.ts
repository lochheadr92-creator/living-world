import type {World} from '../../src/sim/types';
import type {Ctx,Option} from '../../src/sim/optutil';
import {textileProtection} from '../../src/sim/clothing';
/** Counts observed physical transitions; never supplies animals or keeper knowledge. */
export function livestockObserver(w:World){
 const counts:Record<string,number>={},stories:unknown[]=[],seen=new Map<number,{owner:number;tether:boolean;wool:number;pregnant:boolean}>();
 const inc=(k:string,n=1)=>counts[k]=(counts[k]??0)+n,story=(s:unknown)=>{if(stories.length<200)stories.push(s);},previous=w.hooks;
 w.hooks={...previous,onActivityStart(p,a){previous?.onActivityStart?.(p,a);if(a.kind==='animal_work'){inc('start:'+a.data.op);story({tick:w.tick,person:p.id,animal:a.targetId,start:a.data.op});}},
 onActivityEnd(p,a,outcome,detail){previous?.onActivityEnd?.(p,a,outcome,detail);if(a.kind==='animal_work'){inc('end:'+a.data.op+':'+outcome);story({tick:w.tick,person:p.id,animal:a.targetId,op:a.data.op,outcome,detail});}}};
 return {tick(){
  for(const a of w.animals){const s=a.sheep;if(!s)continue;const old=seen.get(a.id);if(!old){inc(s.origin);story({tick:w.tick,animal:a.id,origin:s.origin,parents:s.parents});}if(s.hhId&&s.hhId!==old?.owner)inc('ownership acquired');if(old?.tether&&!s.tether)inc('containment lost');if(old&&s.wool>old.wool)inc('wool grown',s.wool-old.wool);if(s.pregnancy&&!old?.pregnant)inc('pregnancies');inc(s.hhId?'owned animal ticks':'unowned animal ticks');if(s.food<=0||s.water<=0)inc('unfed or unwatered ticks');seen.set(a.id,{owner:s.hhId,tether:!!s.tether,wool:s.wool,pregnant:!!s.pregnancy});}
  for(const id of seen.keys())if(!w.byId.has(id)){inc('living animals removed');seen.delete(id);}
  const woolTools=w.tools.filter(t=>t.textile?.material==='wool');
  for(const p of w.persons){if(p.activity?.kind==='animal_work')inc('care ticks:'+p.activity.phase);for(const t of woolTools)if(t.holder===p.id){const heat=textileProtection(p,t);if(heat>0){inc('wool protection ticks:'+t.kind);inc('wool protection degree ticks',heat);}}}
 },sample(ctx:Ctx,ranked:Option[]){for(const o of ctx.options)if(o.kind==='animal_work')inc('offered:'+o.key.split(':')[1]);if(ranked[0]?.kind==='animal_work')inc('ranked first');},report(){return {counts,stories,woolCreated:w.ledger.created.wool??0,woolConsumed:w.ledger.consumed.wool??0,reasons:Object.fromEntries(Object.entries(w.ledger.reasons).filter(([k])=>/sheep|wool|tether/.test(k))),remaining:w.animals.filter(a=>a.sheep).map(a=>({id:a.id,...a.sheep})),limits:'Samples are repeated opportunities. Founders are initial physical animals, not keeper acquisitions. Protection counts only equipped wool actually in use.'};}};
}
