import { materialPlanScene } from './stored_materials';
import { addPerson, pin } from './kit';
import { RNG } from '../../src/sim/rng';
import { createSite } from '../../src/sim/buildings';
import { proposeProject } from '../../src/sim/townships';
import { relOf } from '../../src/sim/relations';
import { observe } from '../../src/sim/knowledge';
import { perceive } from '../../src/sim/perception';
import { generateOptions, rankOptions } from '../../src/sim/decision';
import { startActivity } from '../../src/sim/activities';
import { stepWorld } from '../../src/sim/world';
import { snapshotInitial } from '../../src/sim/economy';

/** STAGED prior witnessed completion, a personal stone need, and a close civic choice.
 * Equal relationships leave a 0.04 remembered completion below the 0.05 switch margin;
 * the one 0.04 actual-use credit crosses it. No tuning of simulation thresholds. */
export function civicBenefitScene(version=42){
 const f=materialPlanScene(version),{w,store}=f,b=f.ada,a=f.outsider;
 b.name='Ben';b.x=store.doorX+.5;b.y=store.doorY+.5;a.name='Ada';a.x=store.doorX-1;a.y=store.doorY+1;
 const c=addPerson({w,rng:new RNG(124)},'Cora',75,75,{age:30});pin(c);
 for(const p of [a,b,c]){pin(p);p.needs.hunger=100;p.needs.thirst=100;p.needs.energy=100;p.needs.warmth=100;p.needs.safety=100;p.traits.generosity=1;p.traits.diligence=1;p.traits.sociability=1;}
 for(const p of [a,c]){const r=relOf(b,p.id);r.affinity=40;r.trust=10;}
 relOf(a,b.id).affinity=60;relOf(a,c.id).trust=-30;
 const oldId=w.nextId++;
 // Explicit prior knowledge at the checkpoint, not remotely learned from project state.
 b.civicOutcomes=[{projectId:oldId,organiserId:a.id,success:true,tick:w.tick-1,...(version>=42?{buildingId:store.id}:{})}];
 const site=createSite(w,'storehouse',55,47,c.hhId,c.id);proposeProject(w,c,site,'staged next shared project');
 const q=w.civicProjects!.at(-1)!;
 q.participants.push({personId:b.id,requestId:0,since:w.tick,status:'supporting',reason:'staged initial support',materials:{},work:0,supports:c.id},
 {personId:a.id,requestId:0,since:w.tick,status:'refused',reason:'staged disagreement',materials:{},work:0});
 q.council!.coordinatorId=c.id;
 for(const p of [a,b]){observe(w,p,site);perceive(w,p);}
 b.cooldowns.pause=0;a.cooldowns.pause=w.tick+240;
 w.sceneLabel='STAGED: actual public benefit informs a later civic choice';snapshotInitial(w);
 const withdraw=()=>rankOptions(generateOptions(w,b,true,true)).find(o=>o.kind==='withdraw'&&o.targetId===store.id);
 const collect=()=>{const o=withdraw();if(!o?.make)throw new Error('No offered public withdrawal');startActivity(w,b,o.make()!);for(let i=0;i<500&&b.activity;i++)stepWorld(w);};
 const recruit=()=>rankOptions(generateOptions(w,a,true,true)).find(o=>o.key===`socialize:${b.id}:recruit`);
 return {w,a,b,c,store,site,q,withdraw,collect,recruit};
}
