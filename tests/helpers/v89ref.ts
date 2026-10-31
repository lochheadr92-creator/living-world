// Frozen rules-89 ordinary and paid by-product, collection and partial fuel continuations.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {setExternalController} from '../../src/sim/external';
import {observe} from '../../src/sim/knowledge';
import {offcutScene,selectOffcutOption} from './offcuts';
import type {World} from '../../src/sim/types';
export function v89Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const advance=(w:World,n:number)=>{const saved=digest(w),copy=deserializeWorld(serializeWorld(w));for(let t=0;t<n;t++){stepWorld(w);stepWorld(copy);}const uninterrupted=digest(w),continued=digest(copy);if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok)throw new Error('Invalid rules-89 continuation');return {saved,uninterrupted,continued};};
 const w=createWorld({...currentWorldSettings('normal','river',{immigration:false}),rulesVersion:89});for(let n=0;n<600;n++)stepWorld(w);const ordinary=advance(w,120);
 const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});
 try{
  const f=offcutScene(89),a=selectOffcutOption(f,`operate:${f.yard.id}:hew_planks`);
  for(let n=0;n<500&&a.phase==='travel';n++)stepWorld(f.w);for(let n=0;n<5;n++)stepWorld(f.w);
  if(f.yard.ops?.job?.held.wood!==3)throw new Error('Missing paid timber batch');const paid=advance(f.w,300);
  if(f.yard.store.items.offcuts!==2)throw new Error('Missing real recovered fuel');observe(f.w,f.p,f.yard);observe(f.w,f.p,f.fire);
  selectOffcutOption(f,`collect:${f.yard.id}:offcuts`);stepWorld(f.w);const collection=advance(f.w,100);
  if(f.p.inv.offcuts!==2)throw new Error('Missing physical collection');
  const fuel=selectOffcutOption(f,`fuel:${f.fire.id}`);for(let n=0;n<500&&fuel.cycle<1;n++)stepWorld(f.w);
  if(f.p.inv.offcuts!==1||f.w.ledger.consumed.offcuts!==1)throw new Error('Missing partially consumed fuel');const burning=advance(f.w,40);
  if(f.w.ledger.consumed.offcuts!==2)throw new Error('Missing completed fuel use');return {ordinary,paid,collection,burning};
 }finally{release();}
}
