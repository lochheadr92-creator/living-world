// STAGED: a parent and a child of one household. The child is placed in and out of the parent's sight and the child's
// needs are declared; what the parent is offered to do about them is the engine's own ranking. Checks the rules-106
// contract; it is not an example of spontaneous behaviour.
import {stage,addPerson,done,pin} from './kit';
import {perceive} from '../../src/sim/perception';
import {rebuildMobileGrid} from '../../src/sim/registry';
import type {Person} from '../../src/sim/types';
export function rememberedNeedScene(version=106){
 const s=stage('remembered-need'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=version;
 const ada=addPerson(s,'Ada',40,40,{age:35,inv:{bread:3,water:2},hunger:100,thirst:100,energy:100,traits:{generosity:1}});
 const cal=addPerson(s,'Cal',42,40,{age:8,hh:ada.hhId,hunger:100,thirst:100,energy:100});
 done(s);for(const p of [ada,cal]){pin(p);p.needs.warmth=100;p.needs.safety=100;}
 /** the child is placed somewhere (declared) and Ada looks about her: her note of him is her own sight or stays as it was */
 const place=(p:Person,x:number,y:number)=>{p.x=x;p.y=y;rebuildMobileGrid(w);perceive(w,ada);};
 place(cal,42,40); // Ada has seen Cal beside her, fine as he is
 w.sceneLabel='STAGED parent and child; the child\'s position and needs are declared, the care offered is the engine\'s own';
 return {s,w,ada,cal,place,away:()=>place(cal,70,40),back:()=>place(cal,42,40)};
}
