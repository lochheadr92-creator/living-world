// STAGED known workshops, supplies, procedures and a worn axe; decisions and production are autonomous.
import {addPerson,building,done,give,stage} from './kit';
import {observe} from '../../src/sim/knowledge';
import {makeSource} from '../../src/sim/sources';
export function projectProductionScene(version=69){
 const s=stage('project-production');s.w.settings.dynamics='rich';s.w.settings.rulesVersion=version;
 const p=addPerson(s,'Ada',40,40,{age:35,inv:{bread:3,water:3},hunger:100,thirst:100,energy:100,traits:{diligence:1}});
 p.needs.warmth=95;p.needs.safety=95;
 const home=building(s,'hut',36,40,p.hhId,{grain:12});s.w.households.find(h=>h.id===p.hhId)!.homeId=home.id;
 const kiln=building(s,'kiln',44,43,0,{wood:12});
 const smithy=building(s,'smithy',48,43,0,{ore:6});
 const yard=building(s,'timber_yard',44,48,0,{handles:2});
 const tree=makeSource(s.w,'tree',52,50,12);
 give(s.w,p,'hammer');const oldAxe=give(s.w,p,'axe');oldAxe.wear=90;
 done(s);
 p.techniques={charcoal:{source:'initial',learned:0,teacher:0},smelting:{source:'initial',learned:0,teacher:0},forging:{source:'initial',learned:0,teacher:0}};
 for(const b of [home,kiln,smithy,yard,tree])observe(s.w,p,b);
 s.w.sceneLabel='STAGED worn axe, known procedures/workshops and supplies; autonomous production project';
 return {s,w:s.w,p,home,kiln,smithy,yard,tree,oldAxe};
}
