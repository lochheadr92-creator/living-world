import { testKit } from '../../src/sim/scenes';
import { currentWorldSettings } from '../../src/sim/profiles';
import { RNG } from '../../src/sim/rng';
import { createBuilding } from '../../src/sim/buildings';
import { observe } from '../../src/sim/knowledge';
import { newActivity, startActivity } from '../../src/sim/activities';
import { updateEnvironment } from '../../src/sim/environment';
export function nightAuditWorld(){
const w=testKit.flatWorld(currentWorldSettings('normal','staged-night-audit',{immigration:false}));
const rng=new RNG(7);
const p=testKit.addPerson(w,rng,{name:'Ada',x:40.5,y:40.5,hunger:95,thirst:95,energy:95});
const q=testKit.addPerson(w,rng,{name:'Ben',x:12.5,y:40.5,hunger:95,thirst:95,energy:95});
const home=createBuilding(w,'lean_to',41,40,p.hhId);
w.households.find(h=>h.id===p.hhId)!.homeId=home.id;
p.inv.water=2;p.traits.sociability=1;
testKit.finish(w,'natural');w.tick=1673;updateEnvironment(w);observe(w,p,home);
// Ben's already-started approach is staged; movement, acceptance and conversation run normally.
startActivity(w,q,newActivity(w,q,{kind:'socialize',label:'STAGED: approaching Ada for a chat',goal:'a chat',targetId:p.id,targetType:'person',minCommit:1000,maxTicks:1200,data:{purpose:'chat'}}));
return w;
}
