import {expect,it} from 'vitest';
import {homeReplacementScene} from './helpers/home_replacement';
import {destroyBuilding} from '../src/sim/buildings';
import {generateOptions} from '../src/sim/decision';
import {perceive,refreshBeliefs} from '../src/sim/perception';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
const layouts=(f:ReturnType<typeof homeReplacementScene>)=>generateOptions(f.w,f.p,true,true).options.filter(o=>o.key==='plan_site:lean_to'||o.key==='plan_site:hut').map(o=>o.key);
it('an unseen collapse does not teach a household member that another home is needed',()=>{
 const f=homeReplacementScene(),belief=JSON.stringify(f.p.beliefs[f.home.id]);
 expect(layouts(f)).toEqual([]);destroyBuilding(f.w,f.home,'collapsed outside Ada’s sight');
 const before=serializeWorld(f.w),offered=layouts(f);
 expect(JSON.stringify(f.p.beliefs[f.home.id])).toBe(belief);
 expect(serializeWorld(f.w)).toBe(before);expect(conservationReport(f.w).ok).toBe(true);
 expect(serializeWorld(deserializeWorld(before))).toBe(before);
 expect(offered).toEqual([]);
});
it('actual local observation of the missing home opens the existing replacement layout',()=>{
 const f=homeReplacementScene(undefined,false);destroyBuilding(f.w,f.home,'collapsed in sight');perceive(f.w,f.p);refreshBeliefs(f.w,f.p);
 expect(f.p.beliefs[f.home.id]).toBeUndefined();expect(layouts(f)).toContain('plan_site:lean_to');
 expect(conservationReport(f.w).ok).toBe(true);
});
