// Brewing and adult shared-table drinks; meals retain ownership of invitations and food.
import {BUILD_DEF,DAY} from './constants';
import {consume,foodUnits,transfer} from './economy';
import {think} from './mood';import {addLog} from './events';
import {stageOf} from './people';import {reservedFor} from './reserved_goods';
import {beliefsByKind} from './optutil';import type {Ctx} from './optutil';
import {runsRulesVersion} from './rulesversion';
import type {Items,Meal,Person,World} from './types';
export const hasBrewing=(w:World)=>w.settings.dynamics==='rich'&&runsRulesVersion(w,139);
const adult=(w:World,p:Person)=>['adult','elder'].includes(stageOf(w,p));
export function brewDemand(ctx:Ctx):boolean{
 const {world:w,p}=ctx;if(!hasBrewing(w)||!adult(w,p)||ctx.criticals.length||p.needs.hunger<65||p.needs.thirst<65||p.needs.energy<50)return false;
 const bs=beliefsByKind(p,['building']);
 if(!bs.some(b=>b.btype==='hall'&&(b.cond??0)>15))return false;
 const stock=bs.filter(b=>b.hh===p.hhId&&w.tick-b.seen<=DAY);
 const beer=(p.inv.beer??0)+stock.reduce((n,b)=>n+(b.items?.beer??0),0);
 // Finish or collect a personally commissioned batch without repeatedly demanding its raw inputs.
 if(beer<2&&stock.some(b=>b.btype==='brewery'&&b.ops?.client===p.id&&b.ops.job==='brew_beer'))return true;
 if((p.inv.beer??0)<2&&stock.some(b=>(b.items?.beer??0)>0))return true;
 const grain=(p.inv.grain??0)-reservedFor(w,p,'grain')+stock.reduce((n,b)=>n+(b.items?.grain??0),0);
 const food=foodUnits(p.inv)+stock.reduce((n,b)=>n+foodUnits(b.items??{}),0);
 return beer<2&&grain>=8&&food>=8+2*ctx.dependents.length;
}
export function layMealDrinks(w:World,p:Person,m:Meal,n:number):void{
 if(!hasBrewing(w))return;
 const spare=Math.max(0,(p.inv.beer??0)-reservedFor(w,p,'beer'));
 transfer(w,p.inv,m.table,99,'beer',Math.min(n,spare),'person:'+p.id,'meal:'+m.id,'beer set out for a shared meal');
}
export function sipMealDrink(w:World,p:Person,m:Meal):boolean{
 if(!hasBrewing(w)||!adult(w,p)||p.indoors||Math.hypot(p.x-m.x,p.y-m.y)>3||m.status!=='eating'||m.drinkers?.includes(p.id)||p.id!==m.host&&!m.arrived.includes(p.id))return false;
 if(consume(w,m.table,'beer',1,'beer shared with a meal')<1)return false;
 (m.drinkers??=[]).push(p.id);think(w,p,'shared_drink',2,DAY/4,'shared a brewed drink with a meal');addLog(w,p,'social',`Shared a brewed drink at ${m.placeName}.`);return true;
}
export function validateBrewing(w:World):void{
 const check=(items:Items|undefined)=>{const n=items?.beer;if(n!==undefined&&(!hasBrewing(w)||!Number.isSafeInteger(n)||n<0))throw Error('Invalid beer holding');};
 for(const p of w.persons){check(p.inv);for(const b of Object.values(p.beliefs)){check(b.items);check(b.ops?.inputs);check(b.ops?.output);}for(const a of [p.activity,p.suspended])if(a){check(a.data.items);if(a.kind==='plan_site'&&a.data.type==='brewery'&&!hasBrewing(w))throw Error('Invalid brewery layout');}}
 for(const b of w.buildings){check(b.store.items);check(b.ops?.job?.held);check(b.ops?.produced);check(b.ops?.consumed);}
 for(const b of w.piles)check(b.items);for(const c of w.carts)check(c.load);for(const s of w.sites){check(s.delivered);check(s.used);}
 for(const m of w.meals){check(m.table);if(m.drinkers!==undefined&&(!hasBrewing(w)||!Array.isArray(m.drinkers)||new Set(m.drinkers).size!==m.drinkers.length||m.drinkers.some(id=>!Number.isSafeInteger(id)||id<=0)))throw Error('Invalid meal drink record');}
 for(const k of ['initial','created','consumed','spoiled'] as const)check(w.ledger[k]);
 for(const b of [...w.buildings,...w.sites])if(b.type==='brewery'){
  const d=BUILD_DEF.brewery;if(!hasBrewing(w)||b.w!==2||b.h!==2||!Number.isSafeInteger(b.x)||!Number.isSafeInteger(b.y)||b.x<0||b.y<0||b.x+2>w.W||b.y+2>=w.H||!Number.isSafeInteger(b.hhId)||b.hhId<0)throw Error('Invalid brewery');
  if(b.ent==='site'){if(b.workTotal!==d.work||!Number.isFinite(b.work)||b.work<0||b.work>b.workTotal||Object.keys(b.required).length!==Object.keys(d.cost).length||Object.entries(d.cost).some(([k,n])=>b.required[k as keyof Items]!==n))throw Error('Invalid brewery site');}
  else {if(!b.ops||!Number.isFinite(b.condition)||b.condition<0||b.condition>100||b.store.cap!==60||b.doorX!==b.x||b.doorY!==b.y+2)throw Error('Invalid brewery store');const j=b.ops.job;if(j&&(j.recipe!=='brew_beer'||j.total!==100||j.burnTotal!==2400||!['work','burn','ready'].includes(j.phase)||!Number.isFinite(j.progress)||j.progress<0||(j.phase==='work'?j.progress>=100||j.burnLeft!==0:j.progress<100)||(j.phase==='ready'&&j.burnLeft!==0)||j.held.grain!==6||j.held.water!==4||(j.held.wood??0)!==(j.phase==='work'?1:0)||Object.keys(j.held).some(k=>!['grain','water','wood'].includes(k))||!Number.isSafeInteger(j.burnLeft)||j.burnLeft<0||j.burnLeft>2400))throw Error('Invalid brewing batch');}
 }
}
