import {afterEach,expect,it} from 'vitest';
import {homeReplacementScene,observedReplacementScene} from './helpers/home_replacement';
import {destroyBuilding,createBuilding} from '../src/sim/buildings';
import {generateOptions} from '../src/sim/decision';
import {perceive,refreshBeliefs} from '../src/sim/perception';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
import {forget,learn,observe} from '../src/sim/knowledge';
import {siteConflict} from '../src/sim/act_build';
import {setHomeReplacement,layoutHome} from '../src/sim/home_replacement';
import {newActivity,startActivity} from '../src/sim/activities';
import {stepWorld} from '../src/sim/world';
afterEach(()=>setHomeReplacement(true));
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
it('rules 107 and the isolated removal retain the former live-home decision',()=>{
 for(const old of [true,false]){setHomeReplacement(old);const f=homeReplacementScene(old?107:108);
  destroyBuilding(f.w,f.home,'collapsed unseen');expect(layouts(f)).toContain('plan_site:lean_to');}
});
it('a personally told home is enough to withhold replacement; its remembered location is retained',()=>{
 const f=homeReplacementScene(),b={...f.p.beliefs[f.home.id],src:'told' as const,from:999,hops:1};
 learn(f.p,b);destroyBuilding(f.w,f.home,'collapsed unseen');
 const ctx=generateOptions(f.w,f.p,true,true);expect(layoutHome(ctx)).toEqual({type:'hut',x:b.x,y:b.y});expect(layouts(f)).toEqual([]);
});
it('unknown physical housing does not suppress a personal offer but rejects its actual duplicate layout without teaching a location',()=>{
 const f=homeReplacementScene();forget(f.p,f.home.id);
 expect(layouts(f)).toContain('plan_site:lean_to');
 const before=JSON.stringify(f.p.beliefs);expect(siteConflict(f.w,'lean_to',f.hh.id)).toBe('the household already has housing allocated');
 const a=newActivity(f.w,f.p,{kind:'plan_site',label:'Marking out a lean-to',goal:'no known home',tx:30,ty:30,spotX:30,spotY:30,utility:40,minCommit:26,maxTicks:700,data:{type:'lean_to',sx:30,sy:30,hh:f.hh.id}});
 a.phase='work';startActivity(f.w,f.p,a);expect(f.p.activity).toBeNull();expect(f.p.lastResult?.detail).toMatch(/housing allocated/);expect(f.w.sites).toHaveLength(0);
 expect(JSON.stringify(f.p.beliefs)).toBe(before);expect(conservationReport(f.w).ok).toBe(true);
});
it('the completion boundary rejects a home allocated while this layout was under way',()=>{
 const f=homeReplacementScene(undefined,false);destroyBuilding(f.w,f.home,'collapsed in sight');refreshBeliefs(f.w,f.p);
 const a=newActivity(f.w,f.p,{kind:'plan_site',label:'Marking out a lean-to',goal:'no known home',tx:30,ty:30,spotX:30,spotY:30,utility:40,minCommit:26,maxTicks:700,data:{type:'lean_to',sx:30,sy:30,hh:f.hh.id}});
 a.phase='work';startActivity(f.w,f.p,a);expect(f.p.activity?.id).toBe(a.id);
 // Another household member's completed home is staged between the two physical boundaries.
 const replacement=createBuilding(f.w,'hut',70,65,f.hh.id);f.hh.homeId=replacement.id;
 const twin=deserializeWorld(serializeWorld(f.w));
 for(let n=0;n<40;n++){stepWorld(f.w);stepWorld(twin);}
 expect(f.w.sites).toHaveLength(0);expect(f.p.beliefs[replacement.id]).toBeUndefined();
 expect(serializeWorld(f.w)).toBe(serializeWorld(twin));expect(conservationReport(f.w).ok).toBe(true);
});
it('a lean-to still permits a paid hut and explicit in-place upgrades retain their existing checks',()=>{
 const f=homeReplacementScene();destroyBuilding(f.w,f.home,'collapsed');
 const lean=createBuilding(f.w,'lean_to',32,30,f.hh.id);f.hh.homeId=lean.id;observe(f.w,f.p,lean);
 expect(siteConflict(f.w,'lean_to',f.hh.id)).toMatch(/housing allocated/);
 expect(siteConflict(f.w,'hut',f.hh.id)).toBeNull();
 expect(siteConflict(f.w,'hut',f.hh.id,lean.id)).toBeNull();
 expect(siteConflict(f.w,'fire',f.hh.id)).toBeNull();
});
it('an observed lost home starts real gathering, hauling and paid construction with exact saved continuation',()=>{
 const f=observedReplacementScene();destroyBuilding(f.w,f.home,'collapsed in sight');refreshBeliefs(f.w,f.p);
 let paid=false;const starts:string[]=[];f.w.hooks={onActivityStart:(p,a)=>{if(p.id===f.p.id)starts.push(a.kind);}};
 for(let n=0;n<3500&&!f.hh.homeId;n++){stepWorld(f.w);if(f.p.activity?.kind==='build'&&f.p.activity.progress>0)paid=true;}
 expect(paid).toBe(true);
 expect(starts).toEqual(expect.arrayContaining(['plan_site','gather','haul','build']));
 expect(f.w.ledger.consumed.wood).toBeGreaterThan(0);
 expect(f.w.sites.some(s=>s.hhId===f.hh.id&&s.work>0&&s.used.wood!>0)).toBe(true);
 delete f.w.hooks;const saved=serializeWorld(f.w),twin=deserializeWorld(saved);
 for(let n=0;n<1200;n++){stepWorld(f.w);stepWorld(twin);}
 // The corrected finite fixture does not establish completed housing or survival.
 // Its full five-day adverse outcome is retained by the browser diagnostic, not erased here.
 expect(serializeWorld(f.w)).toBe(serializeWorld(twin));expect(conservationReport(f.w).ok).toBe(true);
});
