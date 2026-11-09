import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {knownDependent} from '../../src/sim/known_welfare';
import {isDependent} from '../../src/sim/people';
import {currentWorldSettings} from '../../src/sim/profiles';
import {personById} from '../../src/sim/registry';
import type {World} from '../../src/sim/types';
import {stepWorld} from '../../src/sim/world';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
/** Somebody holds a worry about a living person whom the live read calls dependent and what the worrier knows does not, or the reverse. */
export function liveAndKnownDependencyDiffer(w:World):boolean{
 for(const p of w.persons){
  if(!p.alive)continue;
  for(const c of p.concerns){
   const s=personById(w,c.about);
   if(s&&s.alive&&isDependent(w,s)!==knownDependent(w,s,c))return true;
  }
 }
 return false;
}
/** Rules 179 keeps or drops a worry about someone out of sight on what the worrier knows (age, and what the worry says was seen).
 * Ordinary Normal birch (arrivals on): worries are held from tick 901, and from tick 9,501 the live and the known dependency of a worry's
 * subject disagree (sampled every 50 ticks). 10000 ticks include that, then 120 more after a save and load. */
export function v179Continuation(){
 const w=createWorld({...currentWorldSettings('normal','birch',{immigration:true}),rulesVersion:179});
 let differ=false;
 for(let i=0;i<10000;i++){
  stepWorld(w);
  if(!differ&&i%50===0&&liveAndKnownDependencyDiffer(w))differ=true;
 }
 if(!differ)throw Error('Rules179 reference world never has a worry whose live and known dependency disagree');
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules179 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w))};
}
