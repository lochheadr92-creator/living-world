// STAGED READ (ordinary run, nothing changed): for the hungry gatherers in the longest zero-success food searches found by probe.ts,
// what did the world really hold, what did they believe, and what else could they have done?
// Usage: vite-node <this> <seed> <rules> <out> <tick:personId> [<tick:personId> ...]   (samples must be given in ascending tick order)
import {writeFileSync} from 'node:fs';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import {serializeWorld} from '../../src/app/save';
import {generateOptions,rankOptions} from '../../src/sim/decision';
import {estimatedAmount} from '../../src/sim/knowledge';
import {stageOf} from '../../src/sim/people';
import {isFood} from '../../src/sim/social';
import type {ItemKind,Source} from '../../src/sim/types';
const [seed='forest',rules='160',out='truth.json',...samples]=process.argv.slice(2);
const w=createWorld({...currentWorldSettings('normal',seed),rulesVersion:Number(rules)});
const FOODS=new Set(['berry_bush','fruit_tree','wild_grain','fish_spot']);
const rows:unknown[]=[];let impure=0;
const dist=(a:{x:number;y:number},b:{x:number;y:number})=>Math.round(Math.hypot(a.x-b.x,a.y-b.y)*10)/10;
for(const s of samples){const [t,id]=s.split(':').map(Number);
 while(w.tick<t)stepWorld(w);
 const p=w.persons.find(q=>q.id===id);if(!p){rows.push({tick:t,pid:id,missing:true});continue;}
 const before=serializeWorld(w);const ctx=generateOptions(w,p,true,true),ranked=rankOptions(ctx);if(before!==serializeWorld(w))impure++;
 const hh=w.households.find(h=>h.id===p.hhId);const home=hh?w.byId.get(hh.homeId):undefined;
 const homeFood=home&&'store' in home?Object.entries((home as any).store.items as Record<string,number>).filter(([k,n])=>isFood(k as ItemKind)&&n>0):[];
 const stores=w.buildings.filter(b=>b.store&&Object.entries(b.store.items).some(([k,n])=>isFood(k as ItemKind)&&(n as number)>0)).map(b=>({id:b.id,type:b.type,d:dist(p,b),food:Object.entries(b.store.items).filter(([k,n])=>isFood(k as ItemKind)&&(n as number)>0)})).sort((a,b)=>a.d-b.d).slice(0,5);
 const known=Object.values(p.beliefs).filter(b=>FOODS.has(b.kind as string)).map(b=>{const e=w.byId.get(b.id) as Source|undefined;return {id:b.id,kind:b.kind,d:dist(p,b),believed:b.amount,estimated:estimatedAmount(w,b),seenAgo:w.tick-b.seen,src:b.src,truth:e?e.amount:null};}).sort((a,b)=>a.d-b.d);
 const truthNear=w.sources.filter(e=>FOODS.has(e.type)&&e.amount>=1&&dist(p,e)<=60).map(e=>({id:e.id,type:e.type,amount:e.amount,d:dist(p,e),known:!!p.beliefs[e.id],estimated:p.beliefs[e.id]?estimatedAmount(w,p.beliefs[e.id]):null})).sort((a,b)=>a.d-b.d);
 rows.push({tick:t,pid:id,name:p.name,stage:stageOf(w,p),x:Math.round(p.x),y:Math.round(p.y),needs:Object.fromEntries(Object.entries(p.needs).map(([k,v])=>[k,Math.round(v as number)])),inv:{...p.inv},activity:p.activity?`${p.activity.kind}:${p.activity.need} ${p.activity.label}`:null,
  household:{members:hh?.members.length,aliveMembers:hh?.members.filter(m=>w.byId.get(m)&&(w.byId.get(m) as any).alive).length,homeFood},nearestFoodStores:stores,
  beliefsFoodSources:{count:known.length,believedHasFood:known.filter(k=>k.estimated>=1).length,reallyHasFood:known.filter(k=>(k.truth??0)>=1).length,nearest:known.slice(0,8)},
  truthSourcesWithFoodWithin60:{count:truthNear.length,known:truthNear.filter(x=>x.known).length,nearest:truthNear.slice(0,8)},
  top:ranked.slice(0,8).map(o=>({key:o.key,kind:o.kind,need:o.need,util:Math.round(o.util*10)/10})),
  blockedFood:ctx.blocked.filter(b=>b.tag==='food'||b.kind==='gather').slice(0,8).map(b=>`${b.key}: ${b.blocked}`),criticals:ctx.criticals});}
writeFileSync(out,JSON.stringify({seed,rules:Number(rules),impure,rows},null,1));
console.log(JSON.stringify({seed,rules,impure,samples:rows.length}));
