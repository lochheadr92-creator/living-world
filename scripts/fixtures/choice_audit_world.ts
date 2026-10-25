import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import {abortActivity} from '../../src/sim/activities';
// Natural current meadow/town snapshot, staged free decision for Odette.
export function choiceAuditWorld(){
 const w=createWorld(currentWorldSettings('town','meadow',{immigration:false}));
 while(w.tick<118)stepWorld(w);
 const p=w.persons.find(p=>p.name==='Odette')!;
 abortActivity(w,p,'STAGED decision boundary');p.nextThink=w.tick;
 return w;
}
