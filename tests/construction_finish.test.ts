import {afterEach,expect,it} from 'vitest';
import {constructionFinishScene} from './helpers/construction_finish';
import {generateOptions} from '../src/sim/decision';
import {stepWorld} from '../src/sim/world';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
import {knownConstructionWork,setConstructionFinish} from '../src/sim/construction_finish';
import {observe} from '../src/sim/knowledge';
import {observedReplacementScene} from './helpers/home_replacement';
import {destroyBuilding} from '../src/sim/buildings';
import {refreshBeliefs} from '../src/sim/perception';
import {shelterAt} from '../src/sim/needs';
afterEach(()=>setConstructionFinish(true));
const offer=(f:ReturnType<typeof constructionFinishScene>)=>generateOptions(f.w,f.p,true,true).options.find(o=>o.key===`build:${f.target.id}`);
it('known fully supplied unfinished work remains offered inside the last two percent',()=>{
 const f=constructionFinishScene(),before=serializeWorld(f.w);
 expect(offer(f)?.kind).toBe('build');expect(serializeWorld(f.w)).toBe(before);
 expect(conservationReport(f.w).ok).toBe(true);
});
it('a rested autonomous builder actually finishes the remaining work across a save with no new material',()=>{
 const f=constructionFinishScene(),raw=serializeWorld(f.w),twin=deserializeWorld(raw),wood=f.w.ledger.consumed.wood;
 for(let n=0;n<120&&!f.hh.homeId;n++){stepWorld(f.w);stepWorld(twin);}
 expect(f.hh.homeId).not.toBe(0);expect(f.p.stats.built).toBe(1);expect(f.w.byId.has(f.target.id)).toBe(false);
 expect(f.w.ledger.consumed.wood).toBe(wood);expect(f.w.byId.get(f.hh.homeId)?.ent).toBe('building');
 expect(serializeWorld(f.w)).toBe(serializeWorld(twin));expect(conservationReport(f.w).ok).toBe(true);
});
it('rules 108 retain the frozen last-two-percent exclusion',()=>{
 const f=constructionFinishScene(108);expect(offer(f)).toBeUndefined();
});
it('isolated removal restores that same exclusion',()=>{
 const f=constructionFinishScene();setConstructionFinish(false);expect(offer(f)).toBeUndefined();
});
it('the exact completed boundary stays closed, and partial material headroom is unchanged',()=>{
 const {w}=constructionFinishScene();
 for(const progress of [0.98,0.99,0.999999])expect(knownConstructionWork(w,progress,1)).toBe(true);
 expect(knownConstructionWork(w,1,1)).toBe(false);expect(knownConstructionWork(w,1.01,1)).toBe(false);
 for(const available of [0,0.25,0.5,0.75])for(const progress of [0,0.03,0.05,0.28,0.54,0.8,0.99]){
  const on=knownConstructionWork(w,progress,available);setConstructionFinish(false);expect(knownConstructionWork(w,progress,available)).toBe(on);setConstructionFinish(true);
 }
});
it('a completed physical supply cannot override the person’s remembered shortfall',()=>{
 const f=constructionFinishScene();f.p.beliefs[f.target.id].need={wood:1};
 const raw=serializeWorld(f.w);expect(offer(f)).toBeUndefined();expect(serializeWorld(f.w)).toBe(raw);
 observe(f.w,f.p,f.target);expect(offer(f)?.kind).toBe('build');
});
it('urgent thirst still prevents a near-complete construction offer',()=>{
 const f=constructionFinishScene();f.p.needs.thirst=0;expect(offer(f)).toBeUndefined();
});
it('the retained valid collapse fixture now completes its paid replacement and sleeps there across a save',()=>{
 const f=observedReplacementScene();destroyBuilding(f.w,f.home,'collapsed in sight');refreshBeliefs(f.w,f.p);
 const starts:string[]=[];f.w.hooks={onActivityStart:(p,a)=>{if(p.id===f.p.id)starts.push(a.kind);}};
 for(let n=0;n<4000&&!f.hh.homeId;n++)stepWorld(f.w);
 expect(f.hh.homeId).not.toBe(0);expect(f.p.stats.built).toBe(1);expect(f.w.ledger.consumed.wood).toBe(4);
 expect(starts).toEqual(expect.arrayContaining(['plan_site','gather','haul','build']));
 delete f.w.hooks;const twin=deserializeWorld(serializeWorld(f.w));
 for(let n=0;n<1000&&!(f.p.activity?.kind==='sleep'&&f.p.activity.phase==='work');n++){stepWorld(f.w);stepWorld(twin);}
 expect(f.p.activity?.targetId).toBe(f.hh.homeId);expect(shelterAt(f.w,f.p.x,f.p.y,f.p).cover).toBeGreaterThan(0);
 const energy=f.p.needs.energy;for(let n=0;n<30;n++){stepWorld(f.w);stepWorld(twin);}expect(f.p.needs.energy).toBeGreaterThan(energy);
 expect(serializeWorld(f.w)).toBe(serializeWorld(twin));expect(conservationReport(f.w).ok).toBe(true);
});
