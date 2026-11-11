import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {AGE_CHILD} from '../../src/sim/constants';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {ageYears} from '../../src/sim/people';
import {currentWorldSettings} from '../../src/sim/profiles';
import type {World} from '../../src/sim/types';
import {stepWorld} from '../../src/sim/world';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
/** The saved world holds something only rules 210 makes: a practice in fishing or farming, a practice given by an under-twelve, or
 * a child's memory of who could not teach them. */
export function somethingShown(w:World):boolean{
 if(w.conversations.some(c=>{
  if(c.purpose!=='learn_foraging'||!c.childhood)return false;
  if(c.childhood.skill)return true;
  const b=w.byId.get(c.b);return c.childhood.outcome==='sharing'&&!!b&&b.ent==='person'&&ageYears(w,b)<AGE_CHILD;
 }))return true;
 return w.persons.some(p=>p.alive&&Object.keys(p.cooldowns).some(k=>k.startsWith('noteach:')&&p.cooldowns[k]>w.tick));
}
/** Rules 210 (shown.ts). Ordinary Normal gen-2 (arrivals on), stepped until such a thing is in the world (checked every 25 ticks, at
 * most 40,000 ticks), then to the next multiple of 100 ticks, then 120 more after a save and load. If the world never shows it the
 * function throws rather than recording a pin that does not exercise the rule. */
export function v210Continuation(){
 const w=createWorld({...currentWorldSettings('normal','gen-2',{immigration:true}),rulesVersion:210});
 let reached=false;
 for(let i=0;i<40000&&!reached;i++){stepWorld(w);if(i%25===0&&somethingShown(w))reached=true;}
 if(!reached)throw Error('Rules210 reference world never shows a practice of rules 210');
 while(w.tick%100!==0)stepWorld(w);
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules210 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w)),tick:w.tick-120};
}
