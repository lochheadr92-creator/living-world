// Recovered cool storage: physical private food, with no remote household loss oracle.
import {NUTRITION,DAY,isHomeType,isSolidHome} from './constants';
import {foodUnits} from './economy';
import {beliefsByKind} from './optutil';
import type {Ctx} from './optutil';
import {runsRulesVersion} from './rulesversion';
import type {Entity,ItemKind,Person,World} from './types';
export const hasCellars=(w:World)=>w.settings.dynamics==='rich'&&runsRulesVersion(w,135);
export const cellarAccepts=(k:ItemKind)=>k==='flour'||Object.prototype.hasOwnProperty.call(NUTRITION,k);
export function cellarAccess(w:World,p:Person,e:Entity|undefined):string|null{
 if(e?.ent!=='building'||e.type!=='cellar')return null;
 if(!hasCellars(w)||e.hhId!==p.hhId||!e.hhId)return 'the cellar belongs to another household';
 if(e.condition<=0||p.indoors||Math.hypot(p.x-e.doorX-.5,p.y-e.doorY-.5)>1.5)return 'the cellar doorway is inaccessible';
 return null;
}
export function cellarDemand(ctx:Ctx):number{
 if(!hasCellars(ctx.world))return 0;
 const own=beliefsByKind(ctx.p,['building','site']).filter(b=>b.hh===ctx.p.hhId);
 if(own.some(b=>b.btype==='cellar'))return 0;
 const home=own.find(b=>b.kind==='building'&&isHomeType(b.btype)&&(b.cond??0)>0);
 if(!home)return 0;
 // Rules 152: shelter, then a proper hut, then improvements. A lean-to household's single site slot
 // and scarce stone go to its hut first; an earlier cellar left those households in lean-tos.
 if(runsRulesVersion(ctx.world,152)&&!own.some(b=>b.kind==='building'&&isSolidHome(b.btype)&&(b.cond??0)>0))return 0;
 const food=foodUnits(ctx.p.inv)+own.filter(b=>b.kind==='building'&&ctx.world.tick-b.seen<=DAY).reduce((n,b)=>n+foodUnits(b.items??{}),0);
 return food>=Math.max(5,2*ctx.members.length)?28+Math.min(12,food):0;
}
export function cellarSiteConflict(w:World,hh:number):string|null{
 if(!hasCellars(w)||!hh)return 'cellars need a household owner in these rules';
 return [...w.buildings,...w.sites].some(b=>b.type==='cellar'&&b.hhId===hh)?'the household already has a cellar or cellar project':null;
}
export function validateCellars(w:World):void{
 for(const b of [...w.buildings,...w.sites])if(b.type==='cellar'){
  if(!hasCellars(w)||!Number.isSafeInteger(b.hhId)||b.hhId<0||b.w!==2||b.h!==1||!Number.isSafeInteger(b.x)||!Number.isSafeInteger(b.y)||b.x<0||b.y<0||b.x+2>w.W||b.y+1>=w.H)throw Error('Invalid cellar');
  if(b.ent==='building'&&(b.store?.cap!==90||b.doorX!==b.x||b.doorY!==b.y+1||!Number.isFinite(b.condition)||b.condition<0||b.condition>100))throw Error('Invalid cellar store');
  if(b.ent==='site'&&(b.workTotal!==480||!Number.isFinite(b.work)||b.work<0||b.work>480||b.required?.wood!==6||b.required?.stone!==9||Object.keys(b.required).some(k=>!['wood','stone'].includes(k))))throw Error('Invalid cellar site');
 }
 for(const p of w.persons)for(const a of [p.activity,p.suspended])if(a?.kind==='plan_site'&&a.data?.type==='cellar'&&!hasCellars(w))throw Error('Invalid cellar layout');
}
