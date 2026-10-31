// Immutable rules-117 ordinary company and shelter continuation; never rewrite after recording.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import type {World} from '../../src/sim/types';
export function v117Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const w=createWorld({...currentWorldSettings('normal','meadow',{immigration:true}),rulesVersion:117});
 for(let n=0;n<3000;n++)stepWorld(w);
 const company=w.persons.reduce((n,p)=>n+Object.values(p.relations).filter(r=>r.company).length,0);
 const nightExperience=w.persons.reduce((n,p)=>n+p.intentions.filter(i=>i.shelterChecked!==undefined).length,0);
 if(!company||!nightExperience)throw new Error('Reference did not exercise company and night experience');
 const saved=digest(w),copy=deserializeWorld(serializeWorld(w));
 for(let n=0;n<120;n++){stepWorld(w);stepWorld(copy);}
 const uninterrupted=digest(w),continued=digest(copy);
 if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok)throw new Error('Invalid rules-117 continuation');
 return {company,nightExperience,saved,uninterrupted,continued};
}
