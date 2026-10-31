// STAGED known timber yard with raw wood and handles, a held hammer (and saw), a heavy site deficit and known sources; the cart
// project's adoption, every step and the cart's later use are ordinary autonomous decisions (no forced selection).
import {stage,addPerson,building,site,done,give} from './kit';
import {makeSource} from '../../src/sim/sources';
import {observe} from '../../src/sim/knowledge';
import {perceive} from '../../src/sim/perception';
export function cartProjectScene(version=99,saw=true){
 const s=stage('cart-project'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=version;
 const p=addPerson(s,'Hana',40,40,{age:35,inv:{bread:3,water:3},hunger:100,thirst:100,energy:100,traits:{diligence:1}});
 p.needs.warmth=95;p.needs.safety=95;p.skills.build=1.1;p.skills.carpentry=1.4;
 const home=building(s,'hut',36,40,p.hhId,{grain:12});w.households.find(h=>h.id===p.hhId)!.homeId=home.id;
 const yard=building(s,'timber_yard',46,40,0,{handles:2,wood:8});
 const target=site(s,'storehouse',52,46,p.hhId,p.id);target.required.stone=40;
 const stock=building(s,'storehouse',50,40,0,{stone:30});
 const tree=makeSource(w,'tree',38,46,12),rock=makeSource(w,'rock',43,46,8);
 give(w,p,'hammer');if(saw)give(w,p,'saw');
 done(s);for(const e of [home,yard,target,stock,tree,rock])observe(w,p,e);perceive(w,p);
 w.sceneLabel='STAGED timber yard with raw wood and handles, held hammer and saw, heavy site demand; cart project adoption, work and use are autonomous';
 return {s,w,p,home,yard,target,stock,tree,rock};
}
