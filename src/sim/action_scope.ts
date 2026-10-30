// Personal estimates narrow legal work; they never grant stock, time or future knowledge.
import {CRITICAL,HUNGER_RATE,THIRST_RATE,ENERGY_RATE,isHomeType} from './constants';
import {runsRulesVersion} from './rulesversion';
import type {Ctx,Option} from './optutil';
import type {ItemKind,World} from './types';
export interface ScopeEstimate {walk:number;work:number;amount?:number;item?:ItemKind;}
let enabled=true;
export const actionScopeOn=()=>enabled;
export function setActionScope(on:boolean):void{enabled=on;}
export const hasActionScope=(w:World)=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,71);
/** The return is to a remembered own home, or back to the departure point if none is known. */
export function workWindow(ctx:Ctx,o:Option,e:ScopeEstimate):{work:number;back:number;reason:string}{
 const {p,world}=ctx,b=p.beliefs[o.targetId],x=b?.x??p.x,y=b?.y??p.y,speed=Math.max(0.01,ctx.speed);
 const homes=Object.values(p.beliefs).filter(b=>b.kind==='building'&&b.hh===p.hhId&&isHomeType(b.btype));
 homes.sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y)||a.id-b.id);
 const home=homes[0],back=Math.ceil(Math.hypot((home?.x??p.x)-x,(home?.y??p.y)-y)/speed*1.2);
 const margin=9+Math.round(6*p.traits.caution),harsh=world.settings.harsh?1.18:1,heat=1+Math.max(0,world.weather.temp-19)*0.04;
 const budget:[number,string][]=[
  [(p.needs.hunger-CRITICAL.hunger-margin)/(HUNGER_RATE*1.25*harsh),'food margin'],
  [(p.needs.thirst-CRITICAL.thirst-margin)/(THIRST_RATE*1.3*harsh*heat),'water margin'],
  [(p.needs.energy-CRITICAL.energy-margin)/(ENERGY_RATE*1.35*(ctx.stage==='elder'?1.15:1)),'energy for the return'],
 ];
 let [available,reason]=budget.sort((a,b)=>a[0]-b[0])[0];available-=e.walk+back+20;
 for(const c of p.commitments){
  if(c.status!=='active'||o.tag==='promise'||c.siteId===o.targetId||c.destId===o.targetId||c.to===o.targetId)continue;
  const due=c.deadline+(c.grace??0);if(due<=world.tick)continue;
  const place=p.beliefs[c.destId??c.siteId],heard=p.whereabouts[c.to];
  const at=place??heard;if(!at)continue;
  const travel=Math.ceil(Math.hypot(at.x-x,at.y-y)/speed*1.2);
  const left=due-world.tick-e.walk-travel-40;
  if(left<available){available=left;reason=`accepted duty #${c.id} due at tick ${due}`;}
 }
 return {work:Math.floor(available),back,reason};
}
/** Pure option transformation. The chosen closure still invokes the registered action and ordinary validation. */
export function scopeWorkOptions(ctx:Ctx):void{
 if(!hasActionScope(ctx.world))return;
 const kept:Option[]=[];
 for(const o of ctx.options){
  const e=o.scopeEstimate;if(!e||!o.make||o.need!==null){kept.push(o);continue;}
  const window=workWindow(ctx,o,e),count=e.amount!==undefined,min=count?1:16;
  const maximum=count?Math.max(0,Math.floor(e.amount!)):Math.max(0,Math.ceil(e.work));
  const allowed=Math.min(maximum,count?Math.floor(window.work/Math.max(1,e.work)):window.work);
  if(allowed<min){if(ctx.collect)ctx.blocked.push({...o,make:undefined,util:0,blocked:count&&maximum<1?`no room in my pack for one ${e.item??'unit'}`:`not enough estimated time for the trip and return: ${window.reason}`});continue;}
  const field=count?'amount':'ticks';
  o.bounds=[...(o.bounds??[]).filter(b=>b.field!==field),{kind:'count',field,min,max:allowed,note:count?'maximum for the remaining need, pack and estimated trip; actual stock is rechecked':'a work spell; paid progress stays at the place when the spell ends'}];
  const short=allowed<maximum;
  const scopeReason=count?`plan up to ${allowed} ${e.item??'units'}; estimated return ${window.back} ticks${short?`; limited by ${window.reason}`:''}`:short?`plan up to ${allowed} work ticks, leaving time for ${window.reason}; estimated return ${window.back} ticks`:'';
  if(scopeReason)o.selectionReason=[o.selectionReason,scopeReason].filter(Boolean).join(' · ');
  if(short)o.eta=e.walk+(count?allowed*e.work:allowed);
  const make=o.make,estimate=o.eta;
  o.make=()=>{
   const a=make();if(!a)return null;
   if(count){a.amount=Math.min(a.amount,allowed);a.data.limit={...(a.data.limit??{}),amount:allowed};if(typeof a.data.eta==='number')a.data.eta=estimate;}
   else if(short)a.data.limit={...(a.data.limit??{}),ticks:allowed};
   if(count||short)a.data.workScope={reason:scopeReason,expected:estimate,returnTicks:window.back,field,value:allowed};
   return a;
  };
  kept.push(o);
 }
 ctx.options=kept;
}
export function validateWorkScopes(w:World):void{
 const finite=(n:unknown,min:number,max:number)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
 for(const p of w.persons)for(const a of [p.activity,p.suspended]){
  const s=a?.data.workScope;if(!s)continue;
  if(w.settings.dynamics!=='rich'||!runsRulesVersion(w,71)||!['gather','fetch_water','build','operate'].includes(a!.kind)||typeof s.reason!=='string'||s.reason.length>400||!finite(s.expected,0,1e7)||!finite(s.returnTicks,0,1e7)||!Number.isSafeInteger(s.value)||!finite(s.value,1,1e7)||!['amount','ticks'].includes(s.field)||!finite(a!.data.limit?.[s.field],1,s.value))throw new Error('Invalid work scope');
 }
}
