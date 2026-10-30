// Frozen rules-63 ordinary, active capacity recovery and competing workshop tools before rules 64.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {observe} from '../../src/sim/knowledge';
import {careCapacityScene} from './care_capacity';
import {cartPrerequisiteScene} from './tool_prerequisite';
import type {World} from '../../src/sim/types';
export function v63Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const advance=(w:World,n:number)=>{const saved=digest(w),copy=deserializeWorld(serializeWorld(w));for(let t=0;t<n;t++){stepWorld(w);stepWorld(copy);}return {saved,uninterrupted:digest(w),continued:digest(copy)};};
 const w=createWorld({...currentWorldSettings('normal','meadow',{immigration:false}),rulesVersion:63});
 while(w.tick<6000)stepWorld(w);
 const ordinary=advance(w,3600);
 const f=careCapacityScene(63);f.failGift();f.helper.cooldowns.pause=0;f.helper.nextThink=f.w.tick;stepWorld(f.w);
 const care=advance(f.w,800);
 const t=cartPrerequisiteScene(63);t.target.required.planks=8;observe(t.w,t.p,t.target);t.p.cooldowns.pause=0;t.p.nextThink=t.w.tick;stepWorld(t.w);
 return {ordinary,care,competingTools:advance(t.w,1200)};
}
