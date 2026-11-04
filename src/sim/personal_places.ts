// Personal evidence of a place; never a source of global death or predator knowledge.
import {DAY} from './constants';
import {knowsDeath} from './death_knowledge';
import {runsRulesVersion} from './rulesversion';
import type {Grave,Person,World} from './types';
export interface PlaceMemory {kind:'danger'|'grave';x:number;y:number;since:number;until:number;strength:number;about:number;name:string;graveId?:number;visited?:number;}
export const hasPersonalPlaces=(w:World)=>w.settings.dynamics==='rich'&&runsRulesVersion(w,141);
export function placeHold(w:World,m:PlaceMemory):number{return Math.max(0,Math.min(1,(m.until-w.tick)/Math.max(1,m.until-m.since)))*m.strength;}
function retain(w:World,p:Person,m:PlaceMemory):void{
 const list=(p.placeMemories??[]).filter(x=>x.until>w.tick&&!(x.kind===m.kind&&(m.kind==='grave'?x.about===m.about:Math.hypot(x.x-m.x,x.y-m.y)<4)));
 list.push(m);if(list.length>8)list.splice(0,list.length-8);p.placeMemories=list;
}
/** Called only by the actual bite mutation, for its victim. */
export function rememberBite(w:World,p:Person,wolfId:number):void{
 if(!hasPersonalPlaces(w)||!p.alive)return;
 retain(w,p,{kind:'danger',x:p.x,y:p.y,since:w.tick,until:w.tick+6*DAY,strength:1,about:wolfId,name:'wolf attack'});
}
/** Called by direct observation, after existing death knowledge is acquired. */
export function rememberGrave(w:World,p:Person,g:Grave):void{
 if(!hasPersonalPlaces(w)||!p.alive||p.indoors||p.pose==='sleep'||Math.hypot(p.x-g.x,p.y-g.y)>10||!g.death||!knowsDeath(p,g.death.id))return;
 const r=p.relations[g.death.id];if(!r||(!r.kin&&r.affinity<45&&p.hhId!==g.death.hhId))return;
 if(p.placeMemories?.some(m=>m.kind==='grave'&&m.about===g.death!.id))return;
 // Grief starts when this person learns, not on an unseen death.
 const since=r.deathKnown?.learned??w.tick,until=since+12*DAY;if(until<=w.tick)return;
 retain(w,p,{kind:'grave',x:g.x+.5,y:g.y+.5,since,until,strength:r.kin?1:.6,about:g.death.id,name:g.name,graveId:g.id});
}
export function rememberedDanger(w:World,p:Person,x:number,y:number,r:number):number{
 if(!hasPersonalPlaces(w))return 0;return (p.placeMemories??[]).reduce((n,m)=>m.kind==='danger'?Math.max(n,placeHold(w,m)*Math.max(0,1-Math.hypot(x-m.x,y-m.y)/r)):n,0);
}
export function describePlaces(w:World,p:Person):string[]{return (p.placeMemories??[]).filter(m=>placeHold(w,m)>0).map(m=>m.kind==='danger'?`Remembers being bitten near (${Math.floor(m.x)}, ${Math.floor(m.y)}); caution is fading.`:`Remembers ${m.name}'s grave${m.visited===undefined?'':'; has paid respects'}.`);}
export function validatePlaces(w:World):void{
 for(const p of w.persons){const list=p.placeMemories;if(list!==undefined){
  if(!hasPersonalPlaces(w)||!Array.isArray(list)||list.length>8)throw Error('Invalid personal places');
  for(const m of list)if(!m||!['danger','grave'].includes(m.kind)||!Number.isFinite(m.x)||!Number.isFinite(m.y)||m.x<0||m.y<0||m.x>=w.W||m.y>=w.H||!Number.isSafeInteger(m.since)||m.since<0||m.since>w.tick||!Number.isSafeInteger(m.until)||m.until<=m.since||m.until-m.since>12*DAY||!Number.isFinite(m.strength)||m.strength<=0||m.strength>1||!Number.isSafeInteger(m.about)||m.about<=0||typeof m.name!=='string'||m.name.length>200||(m.kind==='grave'&&(!Number.isSafeInteger(m.graveId)||m.graveId!<=0))||(m.visited!==undefined&&(!Number.isSafeInteger(m.visited)||m.visited<m.since||m.visited>w.tick)))throw Error('Invalid personal place memory');
 }
 for(const a of [p.activity,p.suspended])if(a?.kind==='pay_respects'&&(!hasPersonalPlaces(w)||!Number.isSafeInteger(a.targetId)||a.targetId<=0||!Number.isSafeInteger(a.data.about)||a.data.about<=0||(a.phase==='work'&&(a.duration!==50||!Number.isFinite(a.progress)||a.progress<0||a.progress>=50))))throw Error('Invalid grave visit');
 }
}
