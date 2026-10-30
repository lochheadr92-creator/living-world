// STAGED geometry, needs and initial destination; walking and discovery then use the real engine.
import {stage,addPerson,site,done,pin,building} from './kit';
import {makeSource} from '../../src/sim/sources';
import {observe,delBelief,putBelief,waterBeliefId} from '../../src/sim/knowledge';
import {selectPrerequisite} from './tool_prerequisite';
import {stepWorld} from '../../src/sim/world';
import type {ItemKind,Person,World} from '../../src/sim/types';
export function walkFor(w:World,p:Person,key:string,ticks=85){
 const selected=selectPrerequisite(w,p,key);
 try{for(let i=0;i<ticks;i++)stepWorld(w);}finally{selected.restore();}
 if(p.activity?.id!==selected.act.id||p.activity.phase!=='travel')throw new Error('Fixture must still be making the real initial journey');
 return selected.act;
}
export function sourceJourney(version=65,food=false){
 const s=stage('kept-target'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=version;w.tick=1000;
 const p=addPerson(s,'Hana',40.5,40.5,{age:30,hunger:food?55:100,thirst:100,energy:100,traits:{diligence:.9}});
 const target=site(s,'hut',44,34,p.hhId,p.id);target.required.wood=12;
 const kind=food?'berry_bush':'tree',far=makeSource(w,kind,40,58,8);
 const near=[makeSource(w,kind,41,53,8),makeSource(w,kind,42,52,8)];if(food)near.push(makeSource(w,kind,38,53,8));
 done(s);observe(w,p,target);observe(w,p,far);pin(p);p.cooldowns.trade=1e12;
 w.sceneLabel='STAGED: initial distant source selected externally; real walking, discovery and ordinary reconsideration';
 return {s,w,p,target,far,near,key:`gather:${far.id}`};
}
export function storeJourney(version=65,item:ItemKind='wood'){
 const s=stage('kept-store'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=version;w.tick=1000;
 const p=addPerson(s,'Hana',40.5,40.5,{age:30,hunger:100,thirst:100,energy:100,traits:{diligence:.9}});
 const target=site(s,'hut',44,34,p.hhId,p.id);target.required[item]=12;
 const far=building(s,'storehouse',40,58,0,{[item]:8});
 const near=[building(s,'storehouse',36,53,0,{[item]:8}),building(s,'storehouse',44,53,0,{[item]:8})];
 done(s);observe(w,p,target);observe(w,p,far);pin(p);p.cooldowns.trade=1e12;
 return {s,w,p,target,far,near,key:`collect:${far.id}:${item}`};
}
export function waterJourney(version=65){
 const s=stage('kept-water'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=version;w.tick=1000;
 const p=addPerson(s,'Hana',40.5,40.5,{age:30,hunger:100,thirst:55,energy:100});done(s);
 for(const id of [...(p.bykind.water??[])])delBelief(p,id);
 const cell=Array.from(w.accessCell).findIndex(t=>t>=0&&(t%w.W)>=54&&(t%w.W)<58);
 if(cell<0)throw new Error('Fixture needs a real drinking shore');
 const tile=w.accessCell[cell],far={id:waterBeliefId(cell),kind:'water' as const,x:tile%w.W+.5,y:Math.floor(tile/w.W)+.5,amount:0,max:0,seen:w.tick,src:'seen' as const,from:0,learned:w.tick};
 putBelief(p,far);pin(p);
 return {s,w,p,far,key:`drink:${far.id}`};
}
