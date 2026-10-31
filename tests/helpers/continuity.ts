import {stage,addPerson,site,done,give,pin} from './kit';
import {observe} from '../../src/sim/knowledge';
import {makeSource} from '../../src/sim/sources';
import type {Intention} from '../../src/sim/types';
/** Declared family/work fixtures; no spontaneous occurrence is implied. */
export function continuityScene(version=92,viable=false){
 const s=stage('staged-informed-continuity');s.w.settings.rulesVersion=version;s.w.settings.dynamics='rich';
 const a=addPerson(s,'Ada',40.5,40.5,{age:34,inv:{wood:3},hunger:100,thirst:100,energy:100});
 const b=addPerson(s,'Ben',42.5,40.5,{age:30,hh:a.hhId,hunger:100,thirst:100,energy:100});
 const c=addPerson(s,'Cora',70.5,70.5,{age:30,hh:a.hhId,hunger:100,thirst:100,energy:100});
 const st=site(s,'hut',46,43,a.hhId,a.id);give(s.w,c,'axe');
 if(viable){const tree=makeSource(s.w,'tree',36,40,12);for(const p of [a,b])observe(s.w,p,tree);}
 done(s);
 for(const p of [a,b,c]){pin(p);p.needs.warmth=100;p.needs.safety=100;}for(const p of [a,b])observe(s.w,p,st);
 const plan:Intention={id:s.w.nextId++,kind:'shelter',goal:'build our home',since:0,until:4800,status:'active',reason:'declared staged plan',setAside:0,aboutId:st.id,wants:{wood:3},makes:'',sheltered:0,worked:0,ended:0,step:'',stepKind:'none',stepTarget:0,stepItem:null,stepKey:null,blocked:''};a.intentions.push(plan);
 return {w:s.w,a,b,c,st,plan};
}
