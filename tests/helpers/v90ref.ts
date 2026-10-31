// Frozen rules-90 meal custody, actual recovery and capacity-limited saved continuations.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport,transfer} from '../../src/sim/economy';
import {setExternalController} from '../../src/sim/external';
import {observe} from '../../src/sim/knowledge';
import {generateOptions} from '../../src/sim/decision';
import {startActivity} from '../../src/sim/activities';
import {cancelMeal} from '../../src/sim/meals';
import {leftoverScene} from './meal_leftovers';
import type {World} from '../../src/sim/types';
export function v90Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const advance=(w:World,n:number)=>{const saved=digest(w),copy=deserializeWorld(serializeWorld(w));for(let t=0;t<n;t++){stepWorld(w);stepWorld(copy);}const uninterrupted=digest(w),continued=digest(copy);if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok)throw new Error('Invalid rules-90 continuation');return {saved,uninterrupted,continued};};
 const w=createWorld({...currentWorldSettings('normal','river',{immigration:false}),rulesVersion:90});for(let n=0;n<600;n++)stepWorld(w);const ordinary=advance(w,120);
 const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});
 try{
  const f=leftoverScene(90,false);f.w.tick=f.meal.at-40;
  for(const p of [f.host,f.guest]){p.cooldowns.pause=0;const o=generateOptions(f.w,p,true,true).options.find(o=>o.key===`${p===f.host?'host_meal':'attend_meal'}:${f.meal.id}`);if(!o)throw new Error('Missing meal offer');startActivity(f.w,p,o.make!()!);}
  for(let n=0;n<300&&!f.meal.table.bread;n++)stepWorld(f.w);if(!f.meal.table.bread)throw new Error('Missing actual table food');
  const gathering=advance(f.w,500);if(f.meal.status!=='done'||f.w.piles[0]?.items.bread!==1)throw new Error('Missing physical uneaten serving');
  const g=leftoverScene(90);cancelMeal(g.w,g.meal,'declared interruption');const pile=g.w.piles[0];observe(g.w,g.host,pile);g.host.x=35.5;g.host.cooldowns.pause=0;
  const o=generateOptions(g.w,g.host,true,true).options.find(o=>o.kind==='withdraw'&&o.tag==='meal');if(!o)throw new Error('Missing recovery offer');startActivity(g.w,g.host,o.make!()!);stepWorld(g.w);
  const travel=advance(g.w,400);if(g.host.inv.bread!==6)throw new Error('Missing physical collection');
  const h=leftoverScene(90);cancelMeal(h.w,h.meal,'declared interruption');observe(h.w,h.host,h.w.piles[0]);transfer(h.w,h.hall.store.items,h.host.inv,12,'stone',3,'building:'+h.hall.id,'person:'+h.host.id,'declared capacity fixture');h.host.cooldowns.pause=0;
  const limited=generateOptions(h.w,h.host,true,true).options.find(o=>o.kind==='withdraw'&&o.tag==='meal');if(!limited)throw new Error('Missing limited recovery');const a=limited.make!()!;startActivity(h.w,h.host,a);
  for(let n=0;n<300&&a.phase==='travel';n++)stepWorld(h.w);stepWorld(h.w);if(a.progress<=0||a.progress>=a.duration)throw new Error('Missing partial handling');
  const handling=advance(h.w,60);if(a.cycle!==1||h.w.piles[0]?.items.bread!==3)throw new Error('Missing limited recovery result');
  return {ordinary,gathering,travel,handling};
 }finally{release();}
}
