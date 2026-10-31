// STAGED already-arrived guest, supplied healthy adult, known public fire and open feast.
import {stage,addPerson,building,done} from './kit';
import {callOccasion} from '../../src/sim/occasions';
import {generateOptions} from '../../src/sim/decision';
import {startActivity} from '../../src/sim/activities';
import {CURRENT_RULES_VERSION} from '../../src/sim/rulesversion';
export function occasionParticipationScene(version=CURRENT_RULES_VERSION){
 const s=stage('occasion-participation'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=version;
 const p=addPerson(s,'Ada',40.5,40.5,{age:35,hunger:95,thirst:95,energy:95,traits:{sociability:1},inv:{bread:3,water:3}});
 const home=building(s,'hut',36,40,p.hhId,{grain:8}),hh=w.households.find(h=>h.id===p.hhId)!;hh.homeId=home.id;
 building(s,'fire',40,43);done(s);p.needs.warmth=95;p.needs.safety=95;
 const o=callOccasion(w,'feast',[])!;o.at=w.tick;o.until=w.tick+600;o.status='gathering';
 const option=generateOptions(w,p,true,true).options.find(x=>x.key===`attend:${o.id}`);if(!option?.make)throw new Error('No offered feast');
 const a=option.make();if(!a)throw new Error('No physical standing place');
 // Explicit arrival setup; only the offered engine action may admit the guest or produce consequences.
 p.x=a.spotX;p.y=a.spotY;a.phase='work';a.data.optKey=option.key;startActivity(w,p,a);
 if(!o.attended.includes(p.id))throw new Error('Guest was not physically admitted');
 w.sceneLabel='STAGED healthy supplied adult already at a known public feast. Admission is real; continued participation and interruptions use ordinary decisions.';
 return {w,p,o,a,home};
}
