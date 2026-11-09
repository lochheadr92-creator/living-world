import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {knownHands} from '../../src/sim/known_hands';
import {currentWorldSettings} from '../../src/sim/profiles';
import {helpersOn} from '../../src/sim/social';
import type {World} from '../../src/sim/types';
import {stepWorld} from '../../src/sim/world';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
/** Some site has helpers, and some living person knows of a different number of them than the register holds. */
export function knownAndRegisterDiffer(w:World):boolean{
 for(const st of w.sites){
  const t=helpersOn(w,st.id);
  if(t===0)continue;
  for(const p of w.persons)if(p.alive&&knownHands(w,p,st.id)!==t)return true;
 }
 return false;
}
/** Rules 178 counts, in a candidate's "enough hands already" refusal, the hands the candidate knows of.
 * Ordinary Normal river (arrivals on): from tick 801 a site has helpers and someone knows of a different number (sampled every 50 ticks).
 * No ordinary world reaches the cap in 12,000 ticks (at most 2 helpers against a cap of about 4), so this pin does not reach the refusal
 * itself; tests/known_hands.test.ts does. 2400 ticks include the difference, then 120 more after a save and load. */
export function v178Continuation(){
 const w=createWorld({...currentWorldSettings('normal','river',{immigration:true}),rulesVersion:178});
 let differ=false;
 for(let i=0;i<2400;i++){
  stepWorld(w);
  if(!differ&&i%50===0&&knownAndRegisterDiffer(w))differ=true;
 }
 if(!differ)throw Error('Rules178 reference world never has a known helper count that differs from the register');
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules178 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w))};
}
