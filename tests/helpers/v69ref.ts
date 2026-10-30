// Freeze rules-69 ordinary and connected production behavior before its successor.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport,consume} from '../../src/sim/economy';
import {observe} from '../../src/sim/knowledge';
import {generateOptions} from '../../src/sim/decision';
import {reviewIntentions} from '../../src/sim/intent';
import {toolsHeldBy} from '../../src/sim/toolreg';
import {projectProductionScene} from './project_production';
import type {World,ItemKind} from '../../src/sim/types';
export function v69Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const advance=(w:World,n:number)=>{
  const saved=digest(w),copy=deserializeWorld(serializeWorld(w));
  for(let t=0;t<n;t++){stepWorld(w);stepWorld(copy);}
  const uninterrupted=digest(w),continued=digest(copy);
  if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok)throw new Error('Invalid rules-69 reference');
  return {saved,uninterrupted,continued};
 };
 const w=createWorld({...currentWorldSettings('normal','meadow',{immigration:false}),rulesVersion:69});
 while(w.tick<6000)stepWorld(w);const ordinary=advance(w,3600);
 const f=projectProductionScene(69);stepWorld(f.w);
 if(!f.p.intentions.some(i=>i.project?.goal.item==='axe'))throw new Error('Missing autonomous production project');
 const production=advance(f.w,3000);if(!toolsHeldBy(f.w,f.p.id,'axe').some(t=>t.tier===1))throw new Error('No forged axe');
 const g=projectProductionScene(69);for(let n=0;n<1200&&!g.p.beliefs[g.kiln.id]?.ops?.burn;n++)stepWorld(g.w);
 if(!g.p.beliefs[g.kiln.id]?.ops?.burn)throw new Error('No firing checkpoint');const firing=advance(g.w,2500);
 const h=projectProductionScene(69);for(let n=0;n<2200&&!h.p.activity?.data.projectSupply;n++)stepWorld(h.w);
 const a=h.p.activity;if(!a?.data.projectSupply)throw new Error('No delivery checkpoint');const item=Object.keys(a.data.items)[0] as ItemKind;
 h.p.commitments.push({id:h.w.nextId++,requestId:0,kind:'deliver',to:h.p.id,item,amount:h.p.inv[item]??0,siteId:0,made:h.w.tick,deadline:h.w.tick+2000,status:'active'});
 const competingPromise=advance(h.w,500);
 const r=projectProductionScene(69);stepWorld(r.w);consume(r.w,r.kiln.store.items,'wood',r.kiln.store.items.wood??0,'staged competing use');observe(r.w,r.p,r.kiln);
 reviewIntentions(generateOptions(r.w,r.p,true,true));if(r.p.intentions.find(i=>i.project)?.project?.retries!==1)throw new Error('No reconsideration checkpoint');
 const reconsidered=advance(r.w,1200);
 return {ordinary,production,firing,competingPromise,reconsidered};
}
