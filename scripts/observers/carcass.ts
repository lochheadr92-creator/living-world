import type {World} from '../../src/sim/types';
import type {Ctx,Option} from '../../src/sim/optutil';
/** Observer only: no decisions, draws, inventory changes or time advancement. */
export function carcassObserver(w:World){
 const counts:Record<string,number>={},stories:unknown[]=[],known=new Set<number>();
 const inc=(k:string,n=1)=>counts[k]=(counts[k]??0)+n,previous=w.hooks;
 w.hooks={...previous,onActivityStart(p,a){previous?.onActivityStart?.(p,a);if(a.kind==='butcher')inc('start:'+a.data.part);},
 onActivityEnd(p,a,outcome,detail){previous?.onActivityEnd?.(p,a,outcome,detail);if(a.kind==='butcher'){inc(`end:${a.data.part}:${outcome}:${detail}`);if(stories.length<160)stories.push({tick:w.tick,person:p.id,body:a.targetId,part:a.data.part,outcome,detail});}}};
 return {
  tick(){for(const b of w.piles){if(!b.carcass)continue;inc('body ticks');if(!known.has(b.id)){known.add(b.id);inc('bodies observed');if(stories.length<160)stories.push({tick:w.tick,body:b.id,origin:b.carcass.animalId,parts:{...b.carcass.initial}});}}
   for(const id of known)if(!w.byId.has(id))known.delete(id);
   for(const p of w.persons)if(p.activity?.kind==='butcher')inc('ticks:'+p.activity.phase);
  },
  sample(ctx:Ctx,ranked:Option[]){for(const o of ctx.options)if(o.kind==='butcher')inc('offered:'+o.key.split(':').at(-1));if(ranked[0]?.kind==='butcher')inc('ranked first');},
  report(){return {counts,stories,parts:Object.fromEntries(['meat','hide','fat','rendered_fat'].map(k=>[k,{created:w.ledger.created[k as 'meat']??0,consumed:w.ledger.consumed[k as 'meat']??0,spoiled:w.ledger.spoiled[k as 'meat']??0}])),limits:'Repeated opportunities are samples, not independent events. Butchery ticks distinguish paid work from travel. Parts created are finite origins, not recovered outputs.'};}
 };
}
