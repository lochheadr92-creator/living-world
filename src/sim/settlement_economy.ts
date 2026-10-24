// Observer accounting of actual output and transfers. Never used by inhabitant decisions.
// Inventory and ownership remain authoritative elsewhere; these bounded receipts own no goods.
import type {Building,ItemKind,Items,Person,World} from './types';
import {ALL_ITEMS,DAY} from './constants';
import {runsRulesVersion} from './rulesversion';
export interface ProductionDay {day:number;townshipId:number;kind:'gathering'|'harvest'|'workshop';items:Items;lastSource:number;lastTick:number}
export interface GoodsFlow {tick:number;fromTown:number;toTown:number;from:string;to:string;item:ItemKind;amount:number;reason:string}
export interface EconomicObservations {since:number;production:ProductionDay[];flows:GoodsFlow[]}
const eligible=(w:World)=>w.settings.dynamics==='rich'&&runsRulesVersion(w,21);
export const personTown=(w:World,p:Person):number=>w.households.find(h=>h.id===p.hhId)?.townshipId??0;
function townAt(w:World,x:number,y:number):number{
 let result=0,closest=20;
 for(const t of w.townships??[]){const d=Math.hypot(t.x-x,t.y-y);if(d<closest){closest=d;result=t.id;}}
 return result;
}
export function recordProduction(w:World,townshipId:number,kind:ProductionDay['kind'],item:ItemKind,n:number,source:number):void{
 if(!eligible(w)||!townshipId||n<=0)return;
 const o=w.economicObservations??={since:w.tick,production:[],flows:[]};const day=Math.floor(w.tick/DAY);
 o.production=o.production.filter(p=>p.day>day-8);
 let row=o.production.find(p=>p.day===day&&p.townshipId===townshipId&&p.kind===kind);
 if(!row){row={day,townshipId,kind,items:{},lastSource:source,lastTick:w.tick};o.production.push(row);if(o.production.length>512)o.production.shift();}
 row.items[item]=(row.items[item]??0)+n;row.lastSource=source;row.lastTick=w.tick;
}
export function recordPersonalProduction(w:World,p:Person,kind:ProductionDay['kind'],item:ItemKind,n:number,source:number):void{
 if(eligible(w))recordProduction(w,personTown(w,p),kind,item,n,source);
}
export function recordWorkshopOutput(w:World,b:Building,item:ItemKind,n:number):void{
 if(!eligible(w))return;
 recordProduction(w,townAt(w,b.x+b.w/2,b.y+b.h/2),'workshop',item,n,b.id);
}
function holderTown(w:World,tag:string):number{
 const [kind,key]=tag.split(':');const e=w.byId.get(Number(key));if(!e)return 0;
 if(kind==='person'&&e.ent==='person')return personTown(w,e);
 if((kind==='building'&&e.ent==='building')||(kind==='site'&&e.ent==='site')||(kind==='cart'&&e.ent==='cart')){
  const hh=e.ent==='cart'?e.ownerHh:e.hhId;
  return hh?w.households.find(h=>h.id===hh)?.townshipId??0:townAt(w,e.x,e.y);
 }
 return 0;
}
/** Gross transfers, including returns and rollback; never represented as net trade. */
export function recordGoodsFlow(w:World,from:string,to:string,item:ItemKind,n:number,reason:string):void{
 if(!eligible(w)||n<=0)return;
 const fromTown=holderTown(w,from),toTown=holderTown(w,to);
 if(!fromTown||!toTown||fromTown===toTown)return;
 const o=w.economicObservations??={since:w.tick,production:[],flows:[]};
 o.flows.push({tick:w.tick,fromTown,toTown,from,to,item,amount:n,reason});
 if(o.flows.length>128)o.flows.shift();
}
/** Pure summaries of retained observations, not an occupational assignment. */
export function economicHistory(w:World,townshipId:number):string[]{
 if(!eligible(w))return [];
 const o=w.economicObservations;
 const production=(o?.production??[]).filter(r=>r.townshipId===townshipId&&r.day>Math.floor(w.tick/DAY)-8);
 const rows=['Recent recorded production and resource flows:'];
 for(const kind of ['gathering','harvest','workshop'] as const){
  const rs=production.filter(r=>r.kind===kind),total:Items={};
  for(const r of rs)for(const [k,n] of Object.entries(r.items))total[k as ItemKind]=(total[k as ItemKind]??0)+n!;
  if(rs.length)rows.push(`${kind}: ${Object.entries(total).sort(([a],[b])=>a.localeCompare(b)).map(([k,n])=>`${n} ${k}`).join(', ')}; ${new Set(rs.map(r=>r.day)).size} recorded days. Last source #${rs.at(-1)!.lastSource} at tick ${rs.at(-1)!.lastTick}.`);
 }
 const repeats=new Map<string,Set<number>>();
 for(const r of production)for(const k of Object.keys(r.items)){const key=`${r.kind}: ${k}`;if(!repeats.has(key))repeats.set(key,new Set());repeats.get(key)!.add(r.day);}
 const sustained=[...repeats].filter(([,days])=>days.size>=3).map(([key,days])=>`${key} on ${days.size} days`);
 rows.push(sustained.length?`Repeated activities: ${sustained.join('; ')}.`:'Too little repeated activity recorded to describe a specialisation.');
 if(!production.length)rows.push('No production recorded in the recent window. Older production is not reconstructed.');
 const holder=(tag:string)=>{const id=Number(tag.split(':')[1]);const e=w.byId.get(id);return e?.ent==='person'?e.name:e?.ent==='building'?e.type.replaceAll('_',' '):`recorded holder #${id}`;};
 const name=(id:number)=>w.townships?.find(t=>t.id===id)?.name??`township #${id}`;
 const flows=(o?.flows??[]).filter(r=>r.fromTown===townshipId||r.toTown===townshipId).slice(-6);
 rows.push(flows.length?'Recent transfers between township affiliations (gross, including returns; not net trade):':'No transfers between township affiliations recorded.');
 for(const f of flows)rows.push(`${name(f.fromTown)} → ${name(f.toTown)}: ${f.amount} ${f.item}, ${f.reason}; ${holder(f.from)} → ${holder(f.to)}, tick ${f.tick}.`);
 return rows;
}
export function validateEconomicObservations(w:World):void{
 const o=w.economicObservations;if(!o)return;
 const town=(id:number)=>w.townships?.some(t=>t.id===id);
 if(!runsRulesVersion(w,21)||o.production.length>512||o.flows.length>128||!Number.isFinite(o.since))throw new Error('Invalid settlement economic observations');
 for(const p of o.production)if(!town(p.townshipId)||!Number.isInteger(p.day)||!['gathering','harvest','workshop'].includes(p.kind)||Object.entries(p.items).some(([k,n])=>!ALL_ITEMS.includes(k as ItemKind)||!Number.isFinite(n)||n!<0))throw new Error('Invalid production observation');
 for(const f of o.flows)if(!town(f.fromTown)||!town(f.toTown)||f.fromTown===f.toTown||!Number.isFinite(f.amount)||f.amount<=0||!ALL_ITEMS.includes(f.item)||!Number.isFinite(f.tick))throw new Error('Invalid goods-flow observation');
}
