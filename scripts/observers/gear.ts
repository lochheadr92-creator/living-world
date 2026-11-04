import type {World,Activity} from '../../src/sim/types';
import type {Ctx,Option} from '../../src/sim/optutil';
/** Read-only direct-catch attribution. Mixing with other fish deliberately loses attribution. */
export function gearObserver(w:World){
 const counts:Record<string,number>={},stories:unknown[]=[],seen=new Map<number,{cycle:number;catchTick:number|null;bodyId:number|null}>();
 const pureCatch=new Set<number>(),meals=new Map<number,{lastAte:number;eligible:boolean;activity:Activity;cycle:number}>();
 const inc=(k:string,n=1)=>counts[k]=(counts[k]??0)+n,story=(s:unknown)=>{if(stories.length<200)stories.push(s);};
 const previous=w.hooks;
 w.hooks={...previous,
 onTransfer(e){previous?.onTransfer?.(e);
  if(e.item==='net'||e.item==='trap'||e.reason==='collect net catch')story({tick:w.tick,kind:'transfer',...e});
  if(e.item==='fish'&&e.to.startsWith('person:')){
   const id=Number(e.to.slice(7)),p=w.persons.find(p=>p.id===id);
   if(e.reason==='collect net catch'){
    inc('fish collected',e.n);if(p?.inv.fish===e.n)pureCatch.add(id);
   }else{pureCatch.delete(id);const m=meals.get(id);if(m)m.eligible=false;}
  }
 },
 onActivityStart(p,a){previous?.onActivityStart?.(p,a);if(a.kind==='gear_work'){inc('start:'+a.data.op);story({tick:w.tick,person:p.id,kind:'start',op:a.data.op,target:a.targetId,inv:{...p.inv}});}if(a.kind==='operate'&&/^make_(net|trap)$/.test(String(a.data.recipe)))inc('start:'+a.data.recipe);},
 onActivityEnd(p,a,outcome,detail){previous?.onActivityEnd?.(p,a,outcome,detail);if(a.kind==='gear_work'){inc('end:'+a.data.op+':'+outcome+':'+detail);story({tick:w.tick,person:p.id,kind:'end',op:a.data.op,target:a.targetId,outcome,detail,inv:{...p.inv}});}if(a.kind==='operate'&&/^make_(net|trap)$/.test(String(a.data.recipe)))inc('end:'+a.data.recipe+':'+outcome+':'+detail);}
 };
 return {tick(){
  for(const [id,m] of meals){const p=w.persons.find(p=>p.id===id);if(m.eligible&&p&&p.lastAteTick>m.lastAte&&m.activity.cycle>m.cycle){inc('direct catch fish eaten');story({tick:p.lastAteTick,person:id,kind:'ate direct net catch'});}}
  meals.clear();
  for(const p of w.persons){if(!(p.inv.fish??0))pureCatch.delete(p.id);if(pureCatch.has(p.id)&&p.activity?.kind==='eat'&&p.activity.data.food==='fish')meals.set(p.id,{lastAte:p.lastAteTick,eligible:true,activity:p.activity,cycle:p.activity.cycle});}
  for(const id of pureCatch)if(!w.byId.has(id))pureCatch.delete(id);
  for(const b of w.piles){const g=b.gear;if(!g)continue;const old=seen.get(b.id);if(!old)inc('placed:'+g.kind);if(g.kind==='net'&&g.catchTick!==null&&old?.catchTick!==g.catchTick){inc('net fish caught',b.items.fish??0);story({tick:w.tick,gear:b.id,fish:b.items.fish??0,source:g.sourceId});}if(g.bodyId!==null&&old?.bodyId!==g.bodyId){inc('trapped bodies');story({tick:w.tick,gear:b.id,body:g.bodyId});}seen.set(b.id,{cycle:g.cycle,catchTick:g.catchTick,bodyId:g.bodyId});}
  for(const id of seen.keys())if(!w.byId.has(id))seen.delete(id);
  for(const p of w.persons){const a=p.activity;if(a?.kind==='gear_work')inc('ticks:'+a.phase);if(a?.kind==='operate'&&/^make_(net|trap)$/.test(String(a.data.recipe)))inc('manufacture ticks:'+a.phase);}
 },sample(ctx:Ctx,ranked:Option[]){for(const o of ctx.options)if(o.kind==='gear_work')inc('offered:'+o.key.split(':')[1]);if(ranked[0]?.kind==='gear_work')inc('ranked first');},report(){return {counts,stories,made:{net:w.ledger.created.net??0,trap:w.ledger.created.trap??0},repairFibre:w.ledger.reasons['-repairing deployed gear']??0,remaining:w.piles.filter(b=>b.gear).length,limits:'Samples are not independent opportunities. Direct catch meals count only an observed pack meal while all carried fish came from net collection; mixing and onward transfers lose attribution. The last unobserved tick may be omitted.'};}};
}
