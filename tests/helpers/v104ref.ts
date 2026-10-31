// Frozen rules-104 supper telling: ordinary river and a staged family supper at which a declared reserve plan is told.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {setExternalController} from '../../src/sim/external';
import {DAY} from '../../src/sim/constants';
import {supperFixture} from './household_practices';
import type {Intention,World} from '../../src/sim/types';
export function v104Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const advance=(w:World,n:number)=>{const saved=digest(w),copy=deserializeWorld(serializeWorld(w));for(let t=0;t<n;t++){stepWorld(w);stepWorld(copy);}const uninterrupted=digest(w),continued=digest(copy);if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok||serializeWorld(deserializeWorld(serializeWorld(w)))!==serializeWorld(w))throw new Error('Invalid rules-104 continuation');return {saved,uninterrupted,continued};};
 const w=createWorld({...currentWorldSettings('normal','river',{immigration:false}),rulesVersion:104});for(let n=0;n<600;n++)stepWorld(w);const ordinary=advance(w,120);
 const f=supperFixture(104);let told;try{const m=f.begin();const i:Intention={id:f.w.nextId++,kind:'stock',goal:'put 12 units of food by for the household',since:f.w.tick,until:f.w.tick+DAY*3,status:'active',reason:'declared staged reserve plan',setAside:0,aboutId:f.pantry.id,wants:{},makes:'',sheltered:0,worked:3,ended:0,reserve:12,cue:'season',step:'',stepKind:'none',stepTarget:0,stepItem:null,stepKey:null,blocked:''};f.a.intentions.push(i);
  for(let n=0;n<1500&&!(f.b.relations[f.a.id]?.workHeard?.length);n++)stepWorld(f.w);if(f.b.relations[f.a.id]?.workHeard?.[0]?.via!=='meal')throw new Error('Nothing told at supper');void m;told=advance(f.w,200);}finally{setExternalController(null);}
 return {ordinary,told};
}
