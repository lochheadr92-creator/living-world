import {expect,it} from 'vitest';
import {projectProductionScene} from './helpers/project_production';
import {stepWorld} from '../src/sim/world';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {toolsHeldBy} from '../src/sim/toolreg';
import {conservationReport} from '../src/sim/economy';
import {site} from './helpers/kit';
import {observe} from '../src/sim/knowledge';
import {selectPrerequisite} from './helpers/tool_prerequisite';
it('autonomously adopts a forged-tool project and executes charcoal, smelting and forging with exact saved continuation',()=>{
 const f=projectProductionScene(),events:any[]=[];
 f.w.hooks={onActivityStart:(p,a)=>events.push({tick:f.w.tick,who:p.id,kind:a.kind,recipe:a.data.recipe,target:a.targetId}),onActivityEnd:(_p,a,outcome,detail)=>events.push({tick:f.w.tick,kind:a.kind,outcome,detail})};
 for(let n=0;n<80&&!f.p.intentions.some(i=>i.project);n++)stepWorld(f.w);
 const plan=f.p.intentions.find(i=>i.project);expect(plan,JSON.stringify(f.p.intentions)).toBeDefined();expect(plan?.makes).toBe('axe');
 const copy=deserializeWorld(serializeWorld(f.w));
 for(let n=0;n<3000&&!toolsHeldBy(f.w,f.p.id,'axe').some(t=>t.tier===1);n++){stepWorld(f.w);stepWorld(copy);}
 expect(toolsHeldBy(f.w,f.p.id,'axe').some(t=>t.tier===1),JSON.stringify({plan,events,activity:f.p.activity,needs:f.p.needs})).toBe(true);
 for(const recipe of ['burn_charcoal','smelt_iron','forge_axe'])expect(events.some(e=>e.recipe===recipe)).toBe(true);
 expect(serializeWorld(f.w)).toBe(serializeWorld(copy));expect(conservationReport(f.w).ok).toBe(true);
 // A separate staged construction need selects an actually offered wood trip, proving use rather than merely possession.
 const build=site(f.s,'storehouse',58,50,f.p.hhId,f.p.id);observe(f.w,f.p,build);observe(f.w,f.p,f.tree);
 const forged=toolsHeldBy(f.w,f.p.id,'axe').find(t=>t.tier===1)!,wear=forged.wear,wood=f.p.inv.wood??0;
 const selected=selectPrerequisite(f.w,f.p,`gather:${f.tree.id}`);selected.restore();
 const useCopy=deserializeWorld(serializeWorld(f.w));
 for(let n=0;n<900&&(f.p.inv.wood??0)<=wood;n++){stepWorld(f.w);stepWorld(useCopy);}
 expect(forged.wear).toBeGreaterThan(wear);expect(f.p.inv.wood??0).toBeGreaterThan(wood);
 expect(serializeWorld(f.w)).toBe(serializeWorld(useCopy));expect(conservationReport(f.w).ok).toBe(true);
},120000);
