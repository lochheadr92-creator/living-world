import {stage,addPerson,done,pin} from './kit';
import {newActivity,startActivity} from '../../src/sim/activities';
export function occupiedSiteFixture(version=18){
 const s=stage('occupied-footprint');s.w.settings.dynamics='rich';s.w.settings.rulesVersion=version;s.w.birthCount=0;
 const builder=addPerson(s,'Ada',43.5,45.5,{inv:{wood:8,stone:4},hunger:98,thirst:98});
 const occupant=addPerson(s,'Ben',43.5,43.5,{hunger:98,thirst:98});pin(occupant);
 for(const p of [builder,occupant]){p.needs.warmth=95;p.needs.safety=95;}
 done(s);const w=s.w;w.sceneLabel='STAGED: refuse a home site over an occupant';
 function begin(){startActivity(w,builder,newActivity(w,builder,{kind:'plan_site',label:'Marking out a hut',goal:'staged access contract',tx:44,ty:44,spotX:43.5,spotY:45.5,minCommit:200,maxTicks:500,utility:100,data:{type:'hut',sx:43,sy:43,hh:builder.hhId}}));}
 return {w,builder,occupant,begin};
}
