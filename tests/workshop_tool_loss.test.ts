import { afterEach, expect, it } from 'vitest';
import { batchRecipeScene } from './helpers/batch_recipe';
import { cartPrerequisiteScene, finishPrerequisite, selectPrerequisite } from './helpers/tool_prerequisite';
import { stepWorld } from '../src/sim/world';
import { breakTool, toolOf } from '../src/sim/tools';
import { generateOptions, rankOptions } from '../src/sim/decision';
import { conservationReport } from '../src/sim/economy';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { pin } from './helpers/kit';
import { reviewIntentions } from '../src/sim/intent';
import { hasRequiredToolRecovery, setRequiredToolRecovery, startJob, workJob, STALL_LIMIT } from '../src/sim/facilities';
import { RECIPE_BY_ID } from '../src/sim/recipes';
import { mintTool } from '../src/sim/tools';
import { toolById, toolReport } from '../src/sim/toolreg';
import { parseIntervention } from '../scripts/lab/lab';
import { setExternalController } from '../src/sim/external';
import { describePerson } from '../src/sim/inspect';
afterEach(()=>{setRequiredToolRecovery(true);setExternalController(null);});

it('stops a running required-tool recipe after the tool is lost, preserving paid progress and requesting its replacement', () => {
  const f=batchRecipeScene(61);
  const {act,restore}=selectPrerequisite(f.w,f.p,`operate:${f.yard.id}:saw_planks`);
  try {
    for(let n=0;n<500&&act.phase==='travel';n++)stepWorld(f.w);
    for(let n=0;n<4;n++)stepWorld(f.w);
    const job=f.yard.ops!.job!,progress=job.progress,held={...job.held};
    breakTool(f.w,toolOf(f.w,f.p,'saw')!,'staged mid-work loss');
    stepWorld(f.w);
    expect(job.progress).toBe(progress);
    expect(job.held).toEqual(held);
    expect(f.p.activity).toBeNull();
    expect(f.p.lastResult?.detail).toContain('saw');
    expect(f.p.lastResult?.outcome).toBe('partial');
    const before=serializeWorld(f.w),view=describePerson(f.w,f.p.id)!;
    expect(view.qa.stopping).toContain('needs a saw');
    expect(view.qa.stopping).toContain('at the last attempt');
    expect(view.qa.stoppingIsHistorical).toBe(true);expect(serializeWorld(f.w)).toBe(before);
    expect(generateOptions(f.w,f.p,true,true).toolWanted?.kind).toBe('saw');
    expect(generateOptions(f.w,f.p,true,true).options.some(o=>o.key===`operate:${f.yard.id}:saw_planks`)).toBe(false);
    expect(conservationReport(f.w).ok).toBe(true);
  } finally { restore(); }
});

it('keeps rules 60 and the isolated lab removal on their recorded semantics',()=>{
  for(const version of [60,61]){
    const undo=version===61?parseIntervention('rich-no-required-tool-recovery').install!():()=>{};
    try{
      const f=batchRecipeScene(version),r=RECIPE_BY_ID.saw_planks;
      expect(hasRequiredToolRecovery(f.w)).toBe(false);
      expect(startJob(f.w,f.yard,f.p,r,f.p.id,'staged legacy check')).toBeNull();
      breakTool(f.w,toolOf(f.w,f.p,'saw')!,'staged loss');
      expect(workJob(f.w,f.yard,f.p)).toBe('continue');
      expect(f.yard.ops!.job!.progress).toBeGreaterThan(0);
    }finally{undo();}
  }
});

it('allows optional-tool work and counts the final valid tick before natural required-tool breakage',()=>{
  const f=batchRecipeScene(61),saw=toolOf(f.w,f.p,'saw')!;
  expect(startJob(f.w,f.yard,f.p,RECIPE_BY_ID.saw_planks,f.p.id,'staged wear boundary')).toBeNull();
  saw.wear=99.999;
  expect(workJob(f.w,f.yard,f.p)).toBe('continue');
  expect(toolOf(f.w,f.p,'saw')).toBeNull();
  const job=f.yard.ops!.job!,progress=job.progress,workers={...job.workers},contributions={...f.yard.ops!.contributions};
  expect(progress).toBeGreaterThan(0);
  expect(workJob(f.w,f.yard,f.p)).toBe('missing_tool');
  expect(job.progress).toBe(progress);expect(job.workers).toEqual(workers);expect(f.yard.ops!.contributions).toEqual(contributions);
  const g=batchRecipeScene(61),axe=toolOf(g.w,g.p,'axe');
  if(axe)breakTool(g.w,axe,'staged optional-tool absence');
  expect(startJob(g.w,g.yard,g.p,RECIPE_BY_ID.hew_planks,g.p.id,'staged optional tool')).toBeNull();
  expect(workJob(g.w,g.yard,g.p)).toBe('continue');
  expect(g.yard.ops!.job!.progress).toBeGreaterThan(0);
  expect(conservationReport(f.w).ok&&conservationReport(g.w).ok).toBe(true);
});

it('can use an available rack replacement but cannot use one reserved to another worker',()=>{
  const f=batchRecipeScene(61);
  expect(startJob(f.w,f.yard,f.p,RECIPE_BY_ID.saw_planks,f.p.id,'staged rack case')).toBeNull();
  breakTool(f.w,toolOf(f.w,f.p,'saw')!,'staged loss');
  const rack=mintTool(f.w,'saw',0,0,f.yard.id,f.yard.store.items,0,'staged rack tool');
  rack.loan={lender:0,borrower:f.p.id+500,due:f.w.tick+40};
  expect(workJob(f.w,f.yard,f.p)).toBe('missing_tool');
  expect(f.yard.ops!.job!.progress).toBe(0);
  rack.loan=null;
  expect(workJob(f.w,f.yard,f.p)).toBe('continue');
  expect(toolById(f.w,rack.id)?.loan?.borrower).toBe(f.p.id);
  expect(conservationReport(f.w).ok&&toolReport(f.w).ok).toBe(true);
});

it('gathers and crafts a replacement, then resumes the same paid job across save without duplicating inputs',()=>{
  const f=batchRecipeScene(61),key=`operate:${f.yard.id}:saw_planks`;
  const selected=selectPrerequisite(f.w,f.p,key);
  try{
    for(let n=0;n<500&&selected.act.phase==='travel';n++)stepWorld(f.w);
    for(let n=0;n<4;n++)stepWorld(f.w);
    breakTool(f.w,toolOf(f.w,f.p,'saw')!,'staged mid-work loss');stepWorld(f.w);
    expect(f.p.lastResult?.outcome).toBe('partial');pin(f.p);
  }finally{selected.restore();}
  const job=f.yard.ops!.job!,progress=job.progress,held={...job.held},stockWood=f.yard.store.items.wood;
  const saved=serializeWorld(f.w),copy=deserializeWorld(saved);
  for(let n=0;n<20;n++){stepWorld(f.w);stepWorld(copy);}
  expect(serializeWorld(f.w)).toBe(serializeWorld(copy));expect(job.progress).toBe(progress);
  reviewIntentions(generateOptions(f.w,f.p,true));
  expect(f.p.intentions.some(i=>i.kind==='tool'&&i.makes==='saw')).toBe(true);
  finishPrerequisite(f.w,f.p,`gather:${f.tree.id}`);
  finishPrerequisite(f.w,f.p,`haul:${f.target.id}`);
  finishPrerequisite(f.w,f.p,`gather:${f.rock.id}`);
  // The pack fits only one stone beside the carried provisions. Real sleep then drinking makes room.
  expect(f.p.inv.stone).toBe(1);
  finishPrerequisite(f.w,f.p,`sleep:${f.home.id}`);
  finishPrerequisite(f.w,f.p,'drink:inv');
  finishPrerequisite(f.w,f.p,`gather:${f.rock.id}`);
  finishPrerequisite(f.w,f.p,'craft:saw');
  expect(f.p.inv.saw).toBe(1);expect(f.yard.ops!.job).toBe(job);expect(job.held).toEqual(held);
  const resumed=selectPrerequisite(f.w,f.p,key);
  try{
    const twin=deserializeWorld(serializeWorld(f.w));
    for(let n=0;n<2000&&f.p.activity?.id===resumed.act.id;n++){stepWorld(f.w);stepWorld(twin);}
    expect(serializeWorld(f.w)).toBe(serializeWorld(twin));pin(f.p);
  }finally{resumed.restore();}
  expect(f.yard.ops!.job).toBeNull();expect(f.yard.store.items.planks).toBe(2);
  expect(f.yard.store.items.wood).toBe(stockWood);
  finishPrerequisite(f.w,f.p,key);
  reviewIntentions(generateOptions(f.w,f.p,true));
  const meal=generateOptions(f.w,f.p,true,true).options.find(o=>o.kind==='eat');
  expect(meal).toBeDefined();finishPrerequisite(f.w,f.p,meal!.key);
  // Preserved downstream failure: this staged world supplied one waterskin but no remembered shore.
  // The two completed batches do not authorize starting a longer cart job without feasible water relief.
  const ctx=generateOptions(f.w,f.p,true,true);
  expect(ctx.options.some(o=>o.key===`operate:${f.yard.id}:build_cart`)).toBe(true);
  expect(rankOptions(ctx).some(o=>o.key===`operate:${f.yard.id}:build_cart`)).toBe(false);
  expect(ctx.blocked.some(o=>o.key===`operate:${f.yard.id}:build_cart`&&o.blocked?.includes('no water known'))).toBe(true);
  expect(f.w.carts).toHaveLength(0);
  expect(conservationReport(f.w).ok&&toolReport(f.w).ok).toBe(true);
},30000);

it('also stops required-hammer work and safely shelves a batch whose replacement never arrives',()=>{
  const f=cartPrerequisiteScene(61);
  const hammer=mintTool(f.w,'hammer',0,f.p.hhId,f.p.id,f.p.inv,f.p.id,'staged hammer');
  expect(startJob(f.w,f.yard,f.p,RECIPE_BY_ID.build_cart,f.p.id,'staged no replacement')).toBeNull();
  workJob(f.w,f.yard,f.p);
  breakTool(f.w,hammer,'staged hammer loss');
  const job=f.yard.ops!.job!,progress=job.progress,paid={...job.held};
  expect(workJob(f.w,f.yard,f.p)).toBe('missing_tool');expect(job.progress).toBe(progress);
  const before=serializeWorld(f.w),copy=deserializeWorld(before);
  for(let n=0;n<STALL_LIMIT+2;n++){stepWorld(f.w);stepWorld(copy);}
  expect(serializeWorld(f.w)).toBe(serializeWorld(copy));
  expect(f.yard.ops!.job).toBeNull();expect(f.w.carts).toHaveLength(0);
  for(const [item,n]of Object.entries(paid))expect(f.yard.store.items[item as keyof typeof paid]).toBe(n);
  expect(conservationReport(f.w).ok&&toolReport(f.w).ok).toBe(true);
});
