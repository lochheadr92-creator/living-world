// STAGED contract for rules 156: children do not chop wood or break stone; light food gathering stays open.
// Ordinary origin: a five-year-old chopped wood in a rules-154 meadow world (review_evidence/villager-age-carry-20261104).
import {it,expect,afterEach} from 'vitest';
import {stage,addPerson,done,learn} from './helpers/kit';
import {makeSource} from '../src/sim/sources';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {gatherMaterial} from '../src/sim/options_work';
import {newActivity,startActivity,stepActivity} from '../src/sim/activities';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
import {conservationReport} from '../src/sim/economy';
import {parseIntervention} from '../scripts/lab/lab';
import {setChildTasks,CHILD_HEAVY_REASON} from '../src/sim/child_tasks';
afterEach(()=>setChildTasks(true));

function scene(rules:number,age:number){
 const s=stage('child-tasks');s.w.settings={...s.w.settings,dynamics:'rich',rulesVersion:rules};
 const p=addPerson(s,'Abel',40.5,40.5,{age,hunger:60,thirst:95,energy:95});
 const tree=makeSource(s.w,'tree',43,40,12),rock=makeSource(s.w,'rock',38,42,12),bush=makeSource(s.w,'berry_bush',42,43,6);
 done(s);learn(s.w,p,tree,rock,bush);
 return {w:s.w,p,tree,rock,bush};
}
const gatherTargets=(f:ReturnType<typeof scene>)=>{
 // The real producer of the ordinary case: fuel wood (and stone) wanted for a fire, tag 'fire'.
 const ctx=generateOptions(f.w,f.p,true,true);gatherMaterial(ctx,'wood',2,30,'fuel for the fire','fire');gatherMaterial(ctx,'stone',2,30,'stones for the hearth','fire');
 const ranked=rankOptions(ctx);
 return {ranked:new Set(ranked.filter(o=>o.kind==='gather').map(o=>o.targetId)),blocked:ctx.blocked};
};
const offeredHeavy=(f:ReturnType<typeof scene>)=>{const {ranked}=gatherTargets(f);return ranked.has(f.tree.id)||ranked.has(f.rock.id);};

it('withholds wood and stone from a child with a truthful reason, keeps berries, as a pure read',()=>{
 const f=scene(156,5),before=serializeWorld(f.w),{ranked,blocked}=gatherTargets(f);
 expect(serializeWorld(f.w)).toBe(before);
 expect(ranked.has(f.tree.id)||ranked.has(f.rock.id)).toBe(false);expect(ranked.has(f.bush.id)).toBe(true);
 expect(blocked.some(b=>b.blocked===CHILD_HEAVY_REASON&&(b.targetId===f.tree.id||b.targetId===f.rock.id))).toBe(true);
});

it('leaves youths, adults, rules 155 and the lab removal unchanged',()=>{
 expect(offeredHeavy(scene(156,13))).toBe(true);
 expect(offeredHeavy(scene(156,30))).toBe(true);
 expect(offeredHeavy(scene(155,5))).toBe(true);
 const restore=parseIntervention('rich-no-child-tasks').install!();try{expect(offeredHeavy(scene(156,5))).toBe(true);}finally{restore();}
});

it('refuses wood gathering a child was set on directly, taking nothing and conserving goods',()=>{
 const f=scene(156,5);
 startActivity(f.w,f.p,newActivity(f.w,f.p,{kind:'gather',label:'Chopping wood',goal:'staged assignment',targetId:f.tree.id,targetType:'source',tx:f.tree.x,ty:f.tree.y,spotX:f.tree.x-0.5,spotY:f.tree.y+0.5,item:'wood',amount:2,maxTicks:600}));
 for(let i=0;i<600&&f.p.activity;i++){f.w.tick++;stepActivity(f.w,f.p);}
 expect(f.p.activity).toBeNull();expect(f.p.inv.wood??0).toBe(0);
 expect(f.p.lastResult?.detail).toContain(CHILD_HEAVY_REASON);expect(conservationReport(f.w).ok).toBe(true);
});

it('continues a rules-156 child exactly after saving',()=>{
 const f=scene(156,5),copy=deserializeWorld(serializeWorld(f.w));
 for(let i=0;i<600;i++){stepWorld(f.w);stepWorld(copy);}
 expect(serializeWorld(f.w)).toBe(serializeWorld(copy));expect(f.p.inv.wood??0).toBe(0);expect(f.p.inv.stone??0).toBe(0);
});
