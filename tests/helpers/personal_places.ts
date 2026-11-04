import {stage,addPerson,done} from './kit';
import {registerGeneric} from '../../src/sim/registry';
import {relOf} from '../../src/sim/relations';
import type {Grave} from '../../src/sim/types';
export function placesFixture(){const s=stage('personal-places');s.w.settings={...s.w.settings,dynamics:'rich',rulesVersion:141};const p=addPerson(s,'Ada',40.5,20.5,{hunger:95,thirst:95,energy:95}),q=addPerson(s,'Ben',65.5,20.5,{hunger:95,thirst:95,energy:95});done(s);const deadId=s.w.nextId++;relOf(p,deadId).kin='parent';relOf(q,deadId).kin='parent';const g:Grave={ent:'grave',id:s.w.nextId++,x:44,y:20,name:'Cora',age:70,died:0,death:{id:deadId,name:'Cora',hhId:p.hhId,tick:0}};registerGeneric(s.w,g);return {...s,p,q,g,deadId};}
