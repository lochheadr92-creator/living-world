// A person's bounded experience of being asked for materials, not township statistics.
import type { ItemKind,Person,Request,SkillKey,World } from './types';
import { DAY } from './constants';
import { RECIPES } from './recipes';
import { runsRulesVersion } from './rulesversion';
import { withinHearing } from './death_knowledge';
import { addLog } from './events';
export interface HeardDemand {requestId:number;from:number;item:ItemKind;tick:number}
export const DEMAND_WINDOW=3*DAY,DEMAND_LIMIT=12,DEMAND_BONUS=6;
let enabled=true;
export const localDemandOn=()=>enabled;
export function setLocalDemand(on:boolean):void{enabled=on;}
export const hasLocalDemand=(w:World)=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,43);
const skills=new Map<ItemKind,SkillKey>([['wood','wood'],['stone','stone']]);
for(const r of RECIPES)if(r.skill)for(const item of Object.keys(r.outputs) as ItemKind[])if(!skills.has(item))skills.set(item,r.skill);
export function pruneDemand(w:World,p:Person):void{
 if(!hasLocalDemand(w)||!p.heardDemand)return;
 p.heardDemand=p.heardDemand.filter(m=>m.tick<=w.tick&&w.tick-m.tick<DEMAND_WINDOW).slice(-DEMAND_LIMIT);
 if(!p.heardDemand.length)delete p.heardDemand;
}
/** Response boundary: both people heard the still-live material request. */
export function hearDemand(w:World,listener:Person,asker:Person,r:Request):void{
 if(!hasLocalDemand(w)||r.status!=='pending'||r.from!==asker.id||r.to!==listener.id||r.from===r.to||r.expires<=w.tick||!withinHearing(listener,asker))return;
 if(!['wood','stone','goods','haul'].includes(r.kind))return;
 const item=r.item??(r.kind==='wood'||r.kind==='stone'?r.kind:null);
 if(!item||!skills.has(item)||r.amount<=0)return;
 pruneDemand(w,listener);
 const memories=listener.heardDemand??=[];
 if(memories.some(m=>m.requestId===r.id))return;
 memories.push({requestId:r.id,from:asker.id,item,tick:w.tick});if(memories.length>DEMAND_LIMIT)memories.shift();
 addLog(w,listener,'social',`${asker.name} asked me for ${item}; I will remember this local demand.`);
}
/** Pure: each material requires two different personally heard requesters. */
export function repeatedDemand(w:World,p:Person):Map<SkillKey,{item:ItemKind;people:number}>{
 const result=new Map<SkillKey,{item:ItemKind;people:number}>();if(!hasLocalDemand(w))return result;
 const items=new Map<ItemKind,Set<number>>();
 for(const m of p.heardDemand??[]){if(m.tick>w.tick||w.tick-m.tick>=DEMAND_WINDOW)continue;const ids=items.get(m.item)??new Set<number>();ids.add(m.from);items.set(m.item,ids);}
 for(const [item,ids]of items){const skill=skills.get(item);if(skill&&ids.size>=2&&!result.has(skill))result.set(skill,{item,people:ids.size});}
 return result;
}
