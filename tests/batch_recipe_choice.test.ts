import { afterEach, expect, it } from 'vitest';
import { batchRecipeScene } from './helpers/batch_recipe';
import { generateOptions } from '../src/sim/decision';
import { reviewIntentions, servesIntent } from '../src/sim/intent';
import { batchStep, batchWanted, setBatchRecipeChoice } from '../src/sim/batch_plan';
import { parseIntervention } from '../scripts/lab/lab';
import { observe } from '../src/sim/knowledge';
import { breakTool, toolOf } from '../src/sim/tools';
import { finishPrerequisite, selectPrerequisite } from './helpers/tool_prerequisite';
import { pin } from './helpers/kit';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { stepWorld } from '../src/sim/world';
import { conservationReport } from '../src/sim/economy';
import { endActivity } from '../src/sim/activities';
import { setExternalController } from '../src/sim/external';
afterEach(() => { setBatchRecipeChoice(true); setExternalController(null); });

it('a saw-holder cart plan names the physically offered sawing step, not a suppressed hewing recipe', () => {
  const f = batchRecipeScene(60);
  const plan=f.p.intentions.find(i=>i.kind==='batch'&&i.makes==='cart');
  expect(plan).toBeDefined();
  const ctx=generateOptions(f.w,f.p,true,true);
  expect(ctx.options.some(o=>o.key===`operate:${f.yard.id}:saw_planks`)).toBe(true);
  expect(ctx.options.some(o=>o.key===`operate:${f.yard.id}:hew_planks`)).toBe(false);
  expect(plan!.stepKey).toBe(`operate:${f.yard.id}:saw_planks`);
  expect(ctx.options.some(o=>servesIntent(plan!,o))).toBe(true);
});

it('preserves rules 59 and restores just the old plan choice under its lab ablation', () => {
  const old=batchRecipeScene(59);
  expect(old.p.intentions.find(i=>i.makes==='cart')!.stepKey).toBe(`operate:${old.yard.id}:hew_planks`);
  const undo=parseIntervention('rich-no-batch-recipe-choice').install!();
  try { const f=batchRecipeScene(60);expect(f.p.intentions.find(i=>i.makes==='cart')!.stepKey).toBe(`operate:${f.yard.id}:hew_planks`); }
  finally { undo(); }
});

it('uses locally remembered rack equipment and reverts a cart precursor after actual saw loss', () => {
  const f=batchRecipeScene(60),plan=f.p.intentions.find(i=>i.makes==='cart')!;
  breakTool(f.w,toolOf(f.w,f.p,'saw')!,'staged tool failure');
  expect(batchStep(generateOptions(f.w,f.p,true,true),plan).key).toBe(`operate:${f.yard.id}:hew_planks`);
  // A belief is sufficient to PLAN sawing; execution must still require a real tool.
  f.p.beliefs[f.yard.id].tools=['saw'];
  const before=serializeWorld(f.w);
  expect(batchStep(generateOptions(f.w,f.p,true,true),plan).key).toBe(`operate:${f.yard.id}:saw_planks`);
  expect(serializeWorld(f.w)).toBe(before);
  observe(f.w,f.p,f.yard);
  expect(batchStep(generateOptions(f.w,f.p,true,true),plan).key).toBe(`operate:${f.yard.id}:hew_planks`);
  expect(conservationReport(f.w).ok).toBe(true);
});

it('physically saws the components across a drink break and save, builds the cart and delivers useful stone', () => {
  const f=batchRecipeScene(60),plan=f.p.intentions.find(i=>i.makes==='cart')!;
  // A drink-break case starts mildly thirsty, with carried water. The first fixture was fully hydrated and correctly offered no drink.
  f.p.needs.thirst=64;
  const key=`operate:${f.yard.id}:saw_planks`;
  const {act,restore}=selectPrerequisite(f.w,f.p,key);
  try {
    for(let n=0;n<500&&act.phase==='travel';n++)stepWorld(f.w);
    for(let n=0;n<4;n++)stepWorld(f.w);
    expect(f.yard.ops!.job?.recipe).toBe('saw_planks');
    endActivity(f.w,f.p,'interrupted','staged drink break');
    pin(f.p);
  } finally { restore(); }
  finishPrerequisite(f.w,f.p,'drink:inv');
  reviewIntentions(generateOptions(f.w,f.p,true));
  expect(plan.status).toBe('active');expect(plan.stepKey).toBe(key);
  const resume=selectPrerequisite(f.w,f.p,key);
  try {
    const twin=deserializeWorld(serializeWorld(f.w));
    for(let n=0;n<2000&&f.p.activity?.id===resume.act.id;n++){stepWorld(f.w);stepWorld(twin);}
    expect(serializeWorld(f.w)).toBe(serializeWorld(twin));pin(f.p);
  } finally { resume.restore(); }
  expect(f.yard.store.items.planks).toBe(2);
  finishPrerequisite(f.w,f.p,key);
  expect(f.yard.store.items.planks).toBe(4);
  reviewIntentions(generateOptions(f.w,f.p,true));
  expect(plan.stepKey).toBe(`operate:${f.yard.id}:build_cart`);
  finishPrerequisite(f.w,f.p,plan.stepKey!);
  expect(f.w.carts).toHaveLength(1);
  reviewIntentions(generateOptions(f.w,f.p,true));expect(plan.status).toBe('done');
  finishPrerequisite(f.w,f.p,`sleep:${f.home.id}`);
  const stoneBefore=f.stock.store.items.stone!;
  finishPrerequisite(f.w,f.p,`cart:${f.w.carts[0].id}:${f.target.id}`);
  expect(f.target.delivered.stone).toBeGreaterThan(4);
  expect(f.stock.store.items.stone).toBeLessThan(stoneBefore);
  expect(f.w.carts[0].load.stone??0).toBe(0);
  finishPrerequisite(f.w,f.p,`build:${f.target.id}`);
  expect(f.target.used.stone??0).toBeGreaterThan(0);
  expect(conservationReport(f.w).ok).toBe(true);
},30000);

it('rejects a saw lost after departure at the execution boundary without creating output', () => {
  const f=batchRecipeScene(60),before=f.yard.store.items.wood;
  const {act,restore}=selectPrerequisite(f.w,f.p,`operate:${f.yard.id}:saw_planks`);
  expect(act.phase).toBe('travel');
  breakTool(f.w,toolOf(f.w,f.p,'saw')!,'staged loss after departure');
  try { for(let n=0;n<1000&&f.p.activity?.id===act.id;n++)stepWorld(f.w); }
  finally { restore();pin(f.p); }
  expect(f.p.lastResult?.outcome).toBe('failed');
  expect(f.p.lastResult?.detail).toContain('needs a saw');
  expect(f.yard.store.items.planks??0).toBe(0);
  expect(f.yard.store.items.wood).toBe(before);
  expect(conservationReport(f.w).ok).toBe(true);
});

it('uses the same preferred recipe when the primary batch itself is planks', () => {
  const f=batchRecipeScene(60);
  f.target.required={planks:4};observe(f.w,f.p,f.target);
  const before=serializeWorld(f.w);
  expect(batchWanted(generateOptions(f.w,f.p,true,true))?.recipe).toBe('saw_planks');
  expect(serializeWorld(f.w)).toBe(before);
});
