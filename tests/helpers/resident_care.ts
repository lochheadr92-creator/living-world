// Staged household/injury/food and initial legal departure; return and care are ordinary choices.
import {indoorCareScene} from './indoor_care';
import {leaveHome,doorPoint} from '../../src/sim/habitation';
import {selectPrerequisite} from './tool_prerequisite';
import {stepWorld} from '../../src/sim/world';
import {abortActivity} from '../../src/sim/activities';
import {perceive} from '../../src/sim/perception';
export function residentCareScene(version=66){
 const f=indoorCareScene(version),{w,helper,home}=f;
 if(leaveHome(w,helper))throw new Error('Fixture departure must be lawful');
 const selected=selectPrerequisite(w,helper,'wander');
 try{for(let n=0;n<50;n++)stepWorld(w);}finally{selected.restore();}
 abortActivity(w,helper,'initial staged departure complete');perceive(w,helper);
 const door=doorPoint(home);
 if(Math.hypot(helper.x-door.x,helper.y-door.y)<3)throw new Error('Fixture must actually walk away from the entrance');
 helper.cooldowns.pause=0;helper.nextThink=w.tick;
 w.sceneLabel='STAGED household injury and initial departure; ordinary remembered return, entrance and care';
 return f;
}
