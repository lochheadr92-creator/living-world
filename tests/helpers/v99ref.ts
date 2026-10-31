// Frozen rules-99 prepared project steps: ordinary river, prepared shelf, cart built, cart used and components lost.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport,consume,ledgerSpoil} from '../../src/sim/economy';
import {cartProjectScene} from './cart_project';
import type {World} from '../../src/sim/types';
export function v99Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const advance=(w:World,n:number)=>{const saved=digest(w),copy=deserializeWorld(serializeWorld(w));for(let t=0;t<n;t++){stepWorld(w);stepWorld(copy);}const uninterrupted=digest(w),continued=digest(copy);if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok||serializeWorld(deserializeWorld(serializeWorld(w)))!==serializeWorld(w))throw new Error('Invalid rules-99 continuation');return {saved,uninterrupted,continued};};
 const w=createWorld({...currentWorldSettings('normal','river',{immigration:false}),rulesVersion:99});for(let n=0;n<600;n++)stepWorld(w);const ordinary=advance(w,120);
 const f=cartProjectScene(99);for(let n=0;n<700&&(f.p.beliefs[f.yard.id]?.items?.planks??0)<4;n++)stepWorld(f.w);if((f.yard.store.items.planks??0)<4)throw new Error('No prepared shelf');const prepared=advance(f.w,120);
 for(let n=0;n<600&&!f.w.carts.length;n++)stepWorld(f.w);if(f.w.carts.length!==1)throw new Error('No cart built');const built=advance(f.w,60);
 for(let n=0;n<1500&&!((f.target.delivered.stone??0)>4);n++)stepWorld(f.w);if(!((f.target.delivered.stone??0)>4))throw new Error('No cart use');const used=advance(f.w,50);
 const g=cartProjectScene(99);for(let n=0;n<700&&(g.yard.store.items.planks??0)<4;n++)stepWorld(g.w);consume(g.w,g.yard.store.items,'planks',4,'declared loss of the sawn planks');ledgerSpoil(g.w,'wood',g.tree.amount,'declared loss of the known tree');g.tree.amount=0;g.tree.regrowTimer=0;const lost=advance(g.w,300);if(g.w.carts.length)throw new Error('Cart without components');
 return {ordinary,prepared,built,used,lost};
}
