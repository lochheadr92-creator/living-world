import {runsRulesVersion} from './rulesversion';
import {isHomeType} from './constants';
import {distToFootprint} from './registry';
import {hasLivedLife} from './lived_life';
import type {Intention,Person,World} from './types';

/** Count physical shelter once per tick, regardless of the shelter originally planned.
 * Travel, conversations, open-ground rest and extinguished fires are not shelter. */
export function recordNightShelter(w:World,p:Person,i:Intention):void{
 if(!hasLivedLife(w)||i.kind!=='night'||i.status!=='active'||i.shelterChecked===w.tick)return;
 i.shelterChecked=w.tick;
 const a=p.activity;if(p.convId||(p.cooldowns.pause??0)>w.tick||!a||a.phase!=='work'||a.progress<=0||!['rest','sleep'].includes(a.kind))return;
 const b=w.byId.get(a.targetId);if(!b||b.ent!=='building'||b.condition<=0)return;
 const sheltered=b.type==='fire'?b.fuel>0&&distToFootprint(b,p.x,p.y)<=3:
   isHomeType(b.type)&&(b.type==='lean_to'?distToFootprint(b,p.x,p.y)<=3:p.indoors===b.id);
 if(sheltered)i.sheltered++;
}
export function validateNightExperience(w:World):void{
 for(const p of w.persons)for(const i of p.intentions??[]){const t=i.shelterChecked;if(t===undefined)continue;
  if(w.settings.dynamics!=='rich'||!runsRulesVersion(w,117)||i.kind!=='night'||!Number.isSafeInteger(t)||t<i.since||t>w.tick)throw new Error('Invalid personal shelter accounting');
 }
}
