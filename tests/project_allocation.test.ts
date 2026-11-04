import {expect,it} from 'vitest';
import {projectInputsScene} from './helpers/project_inputs';
import {projectAvailable,nextProjectStep} from '../src/sim/project_step';
import {generateOptions} from '../src/sim/decision';
import {compileProject} from '../src/sim/project_compile';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {startActivity} from '../src/sim/activities';
import {stepWorld} from '../src/sim/world';
import {conservationReport} from '../src/sim/economy';
import type {Intention} from '../src/sim/types';

function scene(version?:number){
 const f=projectInputsScene(version);
 const sibling:Intention={...f.plan,id:f.w.nextId++,kind:'tool',goal:'make a basket',makes:'basket',wants:{wood:3},project:undefined};
 f.p.intentions.push(sibling);
 return {...f,sibling};
}
it('the older project keeps its carried ingredient despite a younger claim, without observer mutation',()=>{
 const {w,p,plan,sibling}=scene(),raw=serializeWorld(w);
 expect(projectAvailable(w,p,plan,'wood')).toBe(1);
 expect(projectAvailable(w,p,sibling,'wood')).toBe(0);
 expect(nextProjectStep(generateOptions(w,p,true,true),plan.project!,plan).phase).toBe('craft');
 expect(serializeWorld(w)).toBe(raw);
});
it('an earlier active claim wins; ended claims do not block the project',()=>{
 const {w,p,plan,sibling}=scene();p.intentions=[sibling,plan];
 expect(projectAvailable(w,p,plan,'wood')).toBe(0);
 sibling.status='dropped';expect(projectAvailable(w,p,plan,'wood')).toBe(1);
});
it('only unclaimed surplus is shared, and an unadopted object cannot reclaim another plan allocation',()=>{
 const {w,p,plan,sibling}=scene();
 expect(projectAvailable(w,p,{wants:{wood:99}},'wood')).toBe(0);
 p.inv.wood=8;
 expect(projectAvailable(w,p,plan,'wood')).toBe(5);
 expect(projectAvailable(w,p,sibling,'wood')).toBe(7);
 expect(projectAvailable(w,p,{wants:{wood:99}},'wood')).toBe(4);
});
it('outstanding delivery promises precede project claims, counting only undelivered amounts',()=>{
 const {w,p,plan}=scene();
 p.commitments.push({id:w.nextId++,requestId:0,kind:'deliver',to:999,item:'wood',amount:2,delivered:1,siteId:0,made:w.tick,deadline:w.tick+1000,status:'active',grace:0});
 expect(projectAvailable(w,p,plan,'wood')).toBe(0);
 p.commitments[0].delivered=2;expect(projectAvailable(w,p,plan,'wood')).toBe(1);
});
it('recompilation and step selection agree about the adopted project own ingredients',()=>{
 const {w,p,plan}=scene(),r=compileProject(generateOptions(w,p,true,true),{item:'cart',quantity:1,tier:0},plan);
 expect(r.ok).toBe(true);if(!r.ok)throw Error(r.reason);
 expect(r.graph.nodes.find(n=>n.item==='wood'&&n.destination===0)?.method).toBe('present');
});
it('current ordinary crafting pays once and continues exactly across a mid-work save with a younger plan',()=>{
 const {w,p,plan}=scene(),opt=generateOptions(w,p,true,true).options.find(o=>o.key==='craft:hammer');
 expect(opt).toBeDefined();startActivity(w,p,opt!.make!()!);
 for(let n=0;n<150&&!(p.activity?.kind==='craft'&&p.activity.progress>0);n++)stepWorld(w);
 expect(p.activity?.kind).toBe('craft');expect(p.activity!.progress).toBeGreaterThan(0);
 const copy=deserializeWorld(serializeWorld(w));
 for(let n=0;n<300&&!(p.inv.hammer??0);n++){stepWorld(w);stepWorld(copy);}
 expect(p.inv.hammer).toBe(1);expect(w.ledger.reasons['-crafting: hammer']).toBe(3);
 expect(conservationReport(w).ok).toBe(true);expect(serializeWorld(w)).toBe(serializeWorld(copy));
 expect(plan.project!.history.some(h=>h.reason.includes('supplies previously counted'))).toBe(false);
});
it('rules 147 preserves the former collision rather than silently changing old worlds',()=>{
 const {w,p,plan}=scene(147);expect(projectAvailable(w,p,plan,'wood')).toBe(0);
 expect(nextProjectStep(generateOptions(w,p,true,true),plan.project!,plan).phase).toBe('blocked');
});
import {afterEach} from 'vitest';
import {setOrderedProjectClaims} from '../src/sim/reserved_goods';
import {parseIntervention} from '../scripts/lab/lab';
import {stepActivity} from '../src/sim/activities';
afterEach(()=>setOrderedProjectClaims(true));
it('the lab removal restores the historical collision and restores its previous switch state',()=>{
 const restore=parseIntervention('rich-no-project-allocation').install!();
 try {const {w,p,plan}=scene();expect(projectAvailable(w,p,plan,'wood')).toBe(0);}
 finally {restore();}
 const {w,p,plan}=scene();expect(projectAvailable(w,p,plan,'wood')).toBe(1);
});
it.each(['promise','cancel'] as const)('rechecks a late %s before physical craft consumption',change=>{
 const {w,p,plan}=scene(),opt=generateOptions(w,p,true,true).options.find(o=>o.key==='craft:hammer');
 expect(opt).toBeDefined();startActivity(w,p,opt!.make!()!);
 for(let n=0;n<150&&!(p.activity?.kind==='craft'&&p.activity.progress>0);n++)stepWorld(w);
 expect(p.activity?.kind).toBe('craft');expect(p.activity!.progress).toBeGreaterThan(0);
 const activity=p.activity!,before={...p.inv};
 if(change==='cancel'){plan.status='dropped';plan.wants={};}
 else p.commitments.push({id:w.nextId++,requestId:0,kind:'deliver',to:999,item:'wood',amount:1,delivered:0,siteId:0,made:w.tick,deadline:w.tick+1000,status:'active',grace:0});
 for(let n=0;n<300&&p.activity?.id===activity.id;n++){w.tick++;stepActivity(w,p);}
 expect(p.activity?.id).not.toBe(activity.id);expect(p.inv).toEqual(before);
 expect(w.ledger.reasons['-crafting: hammer']??0).toBe(0);expect(conservationReport(w).ok).toBe(true);
});
