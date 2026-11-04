// Distinct production capacity recovered from the old expansion branch.
import {BUILD_DEF,DAY} from './constants';
import {beliefsByKind} from './optutil';import type {Ctx} from './optutil';
import {runsRulesVersion} from './rulesversion';
import type {Building,BuildingType,World} from './types';
export const hasRecoveredWorkshops=(w:World)=>w.settings.dynamics==='rich'&&runsRulesVersion(w,138);
export function workshopSiteProblem(w:World,type:BuildingType,deposit:number,x:number,y:number):string|null{
 if(type!=='mine'&&type!=='mill')return null;
 if(!hasRecoveredWorkshops(w))return 'this workshop is unavailable in these rules';
 if(!Number.isFinite(x)||!Number.isFinite(y))return 'a workshop needs a physical location';
 if(type==='mine'){
  const d=w.byId.get(deposit);
  if(d?.ent!=='source'||d.type!=='ore_vein'||Math.hypot(d.x+.5-x,d.y+.5-y)>7)return 'a mine must be beside its finite ore vein';
  if(d.amount-d.reserved<3)return 'not enough unclaimed ore remains for a mine batch';
 }
 return null;
}
export function mineDepositProblem(w:World,b:Building):string|null{
 if(b.type!=='mine')return null;
 const d=w.byId.get(b.ops?.depositId??0);
 return !hasRecoveredWorkshops(w)||d?.ent!=='source'||d.type!=='ore_vein'||Math.hypot(d.x+.5-b.x-b.w/2,d.y+.5-b.y-b.h/2)>7?'the mine is not connected to its ore vein':null;
}
export function recoveredWorkshopWants(ctx:Ctx):{type:BuildingType;signal:number;why:string}[]{
 if(!hasRecoveredWorkshops(ctx.world))return [];
 const bs=beliefsByKind(ctx.p,['building','site']),out:{type:BuildingType;signal:number;why:string}[]=[];
 const has=(t:string)=>bs.some(b=>b.btype===t),stock=(k:'grain'|'ore')=>(ctx.p.inv[k]??0)+bs.filter(b=>b.hh===ctx.p.hhId&&ctx.world.tick-b.seen<=DAY).reduce((n,b)=>n+(b.items?.[k]??0),0);
 if(!has('mine')&&has('smithy')&&stock('ore')<3&&beliefsByKind(ctx.p,['ore_vein']).some(b=>b.amount>=6))out.push({type:'mine',signal:.9,why:'the smithy needs ore and a known vein could support a batch mine'});
 if(!has('mill')&&has('bakery')&&stock('grain')>=6)out.push({type:'mill',signal:.85,why:'grind spare grain separately so the bakery can keep baking'});
 return out;
}
export function validateRecoveredWorkshops(w:World):void{
 for(const b of [...w.buildings,...w.sites])if(b.type==='mine'||b.type==='mill'){
  const d=BUILD_DEF[b.type];
  if(!hasRecoveredWorkshops(w)||b.w!==d.w||b.h!==d.h||!Number.isSafeInteger(b.x)||!Number.isSafeInteger(b.y)||b.x<0||b.y<0||b.x+b.w>w.W||b.y+b.h>=w.H||!Number.isSafeInteger(b.hhId)||b.hhId<0)throw Error('Invalid recovered workshop');
  if(b.type==='mine'){const id=b.ent==='building'?b.ops?.depositId:b.depositId,dep=w.sources.find(s=>s.id===id);if(!dep||dep.type!=='ore_vein'||Math.hypot(dep.x+.5-b.x-b.w/2,dep.y+.5-b.y-b.h/2)>7)throw Error('Invalid mine vein');}
  if(b.ent==='building'){
   if(!b.ops||b.store.cap!==d.cap||b.doorX!==b.x||b.doorY!==b.y+b.h||!Number.isFinite(b.condition)||b.condition<0||b.condition>100)throw Error('Invalid recovered workshop store');
   const j=b.ops.job;
   if(j){const mine=b.type==='mine',key=mine?'ore':'grain',n=mine?3:6;
    if(j.recipe!==(mine?'mine_ore':'mill_flour_separate')||j.total!==(mine?110:210)||!['work','ready'].includes(j.phase)||j.burnLeft!==0||j.burnTotal!==0||!Number.isFinite(j.progress)||j.progress<0||(j.phase==='work'?j.progress>=j.total:j.progress<j.total)||j.held[key]!==n||Object.keys(j.held).some(k=>k!==key))throw Error('Invalid recovered workshop batch');
   }
  }else if(b.workTotal!==d.work||!Number.isFinite(b.work)||b.work<0||b.work>b.workTotal||Object.keys(b.required).length!==Object.keys(d.cost).length||Object.entries(d.cost).some(([k,n])=>b.required[k as keyof typeof b.required]!==n))throw Error('Invalid recovered workshop site');
 }
 for(const p of w.persons)for(const a of [p.activity,p.suspended])if(a?.kind==='plan_site'&&['mine','mill'].includes(a.data.type)&&!hasRecoveredWorkshops(w))throw Error('Invalid recovered workshop layout');
}
