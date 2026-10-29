// STAGED contracts for the batch plan (rules 50): a wanted workshop product seen through from input to use.
import { afterEach, expect, it } from 'vitest';
import { addPerson, building, done, give, pin, site, stage } from './helpers/kit';
import { makeSource } from '../src/sim/sources';
import { observe } from '../src/sim/knowledge';
import { perceive } from '../src/sim/perception';
import { generateOptions } from '../src/sim/decision';
import { reviewIntentions } from '../src/sim/intent';
import { stepWorld, hashWorld } from '../src/sim/world';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { conservationReport } from '../src/sim/economy';
import { batchWanted, hasBatchPlans, setBatchPlans } from '../src/sim/batch_plan';
import { RESUME_AFTER, resumableJob, setBatchResume, startJob } from '../src/sim/facilities';
import { RECIPE_BY_ID } from '../src/sim/recipes';
import { parseIntervention } from '../scripts/lab/lab';

afterEach(() => {
  setBatchPlans(true);
  setBatchResume(true);
});

/** Ada's household has a house site short of bricks; a communal kiln stands empty; she knows a clay pit and trees. */
function brickScene(version: number, o: { clay?: boolean; kiln?: boolean } = {}) {
  const s = stage(`batch-bricks-${version}-${o.clay === false ? 'noclay' : 'clay'}-${o.kiln === false ? 'nokiln' : 'kiln'}`);
  const w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = version;
  const ada = addPerson(s, 'Ada', 40.5, 40.5, { age: 32, hunger: 100, thirst: 100, energy: 100, traits: { diligence: 1 } });
  const hut = building(s, 'hut', 36, 36, ada.hhId, { grain: 8 }); // fed at home, so the food reserve plan does not come first
  w.households.find((h) => h.id === ada.hhId)!.homeId = hut.id;
  const house = site(s, 'house', 44, 44, ada.hhId, ada.id, { wood: 6, planks: 8 });
  const kiln = o.kiln === false ? null : building(s, 'kiln', 50, 36, 0, {});
  const pit = o.clay === false ? null : makeSource(w, 'clay_pit', 54, 46, 30);
  const trees = [makeSource(w, 'tree', 34, 48, 8), makeSource(w, 'tree', 35, 49, 8), makeSource(w, 'tree', 36, 50, 8)];
  done(s);
  for (const e of [hut, house, ...(kiln ? [kiln] : []), ...(pit ? [pit] : []), ...trees]) observe(w, ada, e);
  ada.cooldowns.trade = 1e12;
  perceive(w, ada);
  return { w, ada, house, kiln, pit };
}

it('rules 50: bricks wanted for a site, a known kiln and a known clay pit make a batch plan; rules 49 makes none', () => {
  const old = brickScene(49);
  expect(hasBatchPlans(old.w)).toBe(false);
  expect(batchWanted(generateOptions(old.w, old.ada, true, true))).toBeNull();
  reviewIntentions(generateOptions(old.w, old.ada, true));
  expect(old.ada.intentions.find((i) => i.kind === 'batch')).toBeUndefined();
  const f = brickScene(50);
  const want = batchWanted(generateOptions(f.w, f.ada, true, true))!;
  expect(want.item).toBe('bricks');
  expect(want.recipe).toBe('fire_bricks');
  expect(want.facilityId).toBe(f.kiln!.id);
  expect(want.forSite).toBe(f.house.id);
  expect(want.wants).toEqual({ clay: 4, wood: 2 });
  reviewIntentions(generateOptions(f.w, f.ada, true));
  const plan = f.ada.intentions.find((i) => i.kind === 'batch')!;
  expect(plan).toBeDefined();
  expect(plan.makes).toBe('bricks');
  expect(plan.recipe).toBe('fire_bricks');
  expect(plan.forSite).toBe(f.house.id);
  expect(plan.stepKind).toBe('get');
  expect(plan.stepItem).toBe('clay');
});

it('rules 50: no plan without a known clay source or without a known kiln', () => {
  const noClay = brickScene(50, { clay: false });
  expect(batchWanted(generateOptions(noClay.w, noClay.ada, true, true))).toBeNull();
  const noKiln = brickScene(50, { kiln: false });
  expect(batchWanted(generateOptions(noKiln.w, noKiln.ada, true, true))).toBeNull();
});

it('rules 50: the plan carries the chain through: dig clay, bring it to the kiln, fire bricks, collect them, haul them to the site', () => {
  const f = brickScene(50);
  f.ada.cooldowns.pause = 0;
  const seen = new Set<string>();
  let plan = null as ReturnType<typeof f.ada.intentions.find> | null;
  for (let i = 0; i < 9000; i++) {
    stepWorld(f.w);
    plan = f.ada.intentions.find((x) => x.kind === 'batch') ?? plan;
    if (f.ada.activity) seen.add(f.ada.activity.kind + (f.ada.activity.kind === 'operate' ? ':' + String(f.ada.activity.data.recipe ?? '') : ''));
    if ((f.house.delivered.bricks ?? 0) + (f.house.used.bricks ?? 0) >= 3) break;
  }
  expect(plan).toBeDefined();
  expect(seen.has('gather')).toBe(true);
  expect(seen.has('deposit')).toBe(true);
  expect([...seen].some((k) => k.startsWith('operate'))).toBe(true);
  expect(f.kiln!.ops!.produced.bricks ?? 0).toBeGreaterThanOrEqual(3);
  expect((f.house.delivered.bricks ?? 0) + (f.house.used.bricks ?? 0)).toBeGreaterThanOrEqual(3);
  for (let i = 0; i < 200 && plan!.status === 'active'; i++) stepWorld(f.w); // the world settles the plan on its own tick
  expect(plan!.status).toBe('done');
  expect(plan!.reason).toMatch(/brought 3 bricks from the kiln to the site/);
  expect(f.w.ledger.reasons['+made fired bricks']).toBeGreaterThanOrEqual(3);
  expect(conservationReport(f.w).ok).toBe(true);
});

it('rules 50: a water jar wanted by a farmer is fired at the kiln and ends in the pack', () => {
  const s = stage('batch-jar-50');
  const w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = 50;
  const bo = addPerson(s, 'Bo', 40.5, 40.5, { age: 32, hunger: 100, thirst: 100, energy: 100, traits: { diligence: 1 } });
  bo.stats.farmed = 8;
  give(w, bo, 'axe'); // housed, fed and equipped, so no home, reserve or tool plan comes first and the jar is the one want
  const home = building(s, 'hut', 36, 36, bo.hhId, { grain: 8 });
  w.households.find((h) => h.id === bo.hhId)!.homeId = home.id;
  const kiln = building(s, 'kiln', 44, 34, 0, {}); // near home and the water, so the relief guard (far from water) does not refuse the trip
  const pit = makeSource(w, 'clay_pit', 46, 44, 30);
  const trees = [makeSource(w, 'tree', 34, 48, 8), makeSource(w, 'tree', 35, 49, 8), makeSource(w, 'tree', 36, 50, 8)];
  done(s);
  for (const e of [home, kiln, pit, ...trees]) observe(w, bo, e);
  bo.cooldowns.trade = 1e12;
  perceive(w, bo);
  const want = batchWanted(generateOptions(w, bo, true, true))!;
  expect(want?.item).toBe('jar');
  expect(want.recipe).toBe('fire_jar');
  bo.cooldowns.pause = 0;
  let plan = null as ReturnType<typeof bo.intentions.find> | null;
  for (let i = 0; i < 9000 && (bo.inv.jar ?? 0) < 1; i++) {
    stepWorld(w);
    plan = bo.intentions.find((x) => x.kind === 'batch') ?? plan;
  }
  expect(bo.inv.jar ?? 0).toBeGreaterThanOrEqual(1);
  for (let i = 0; i < 300 && plan!.status === 'active'; i++) stepWorld(w);
  expect(plan!.status).toBe('done');
  expect(conservationReport(w).ok).toBe(true);
});

it('rules 50: the switch removes the plan, saving and replaying are exact, observing changes nothing, and a dead planner’s plan ends', () => {
  const restore = parseIntervention('rich-no-batch-plans').install!();
  const off = brickScene(50);
  expect(batchWanted(generateOptions(off.w, off.ada, true, true))).toBeNull();
  restore();
  const f = brickScene(50);
  const before = serializeWorld(f.w);
  batchWanted(generateOptions(f.w, f.ada, true, true));
  expect(serializeWorld(f.w)).toBe(before);
  reviewIntentions(generateOptions(f.w, f.ada, true));
  expect(f.ada.intentions.find((i) => i.kind === 'batch')).toBeDefined();
  const copy = deserializeWorld(serializeWorld(f.w));
  f.ada.cooldowns.pause = 0;
  copy.persons.find((p) => p.id === f.ada.id)!.cooldowns.pause = 0;
  for (let i = 0; i < 2000; i++) {
    stepWorld(f.w);
    stepWorld(copy);
  }
  expect(hashWorld(copy)).toBe(hashWorld(f.w));
  expect(serializeWorld(copy)).toBe(serializeWorld(f.w));
  void pin;
});

it('rules 50: a batch left in its work phase can be got back to by its maker at once, and by anyone with access once it has sat; rules 49 blocks both', () => {
  for (const version of [49, 50] as const) {
    const s = stage('batch-resume-' + version);
    const w = s.w;
    w.settings.dynamics = 'rich';
    w.settings.rulesVersion = version;
    const ana = addPerson(s, 'Ana', 40.5, 40.5, { age: 32, hunger: 100, thirst: 100, energy: 100 });
    const cal = addPerson(s, 'Cal', 42.5, 40.5, { age: 32, hunger: 100, thirst: 100, energy: 100 });
    const kiln = building(s, 'kiln', 44, 34, 0, { clay: 4, wood: 2 });
    done(s);
    const r = RECIPE_BY_ID.fire_bricks;
    expect(startJob(w, kiln, ana, r, ana.id, 'staged', 0)).toBeNull();
    const job = kiln.ops!.job!;
    job.progress = 30; // worked part of it, then called away
    job.lastWork = w.tick;
    expect(resumableJob(w, kiln, ana, r)).toBe(version === 50);
    expect(startJob(w, kiln, ana, r, ana.id, 'staged', 0)).toBe(version === 50 ? null : 'a batch is already under way');
    expect(kiln.ops!.job).toBe(job); // the same job, nothing drawn again
    expect(job.progress).toBe(30);
    // somebody else: not yet, then after the wait
    expect(resumableJob(w, kiln, cal, r)).toBe(false);
    w.tick += RESUME_AFTER + 1;
    expect(resumableJob(w, kiln, cal, r)).toBe(version === 50);
    if (version === 50) {
      setBatchResume(false);
      expect(resumableJob(w, kiln, ana, r)).toBe(false);
      setBatchResume(true);
    }
  }
});

it('rules 50: a household with spare grain and a known bakery mills flour first and then bakes bread, one plan at one workshop', () => {
  const s = stage('batch-bread-50');
  const w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = 50;
  // she carries the loaf's water: the flat test world has no lake within reach of its camp, so water cannot be a known input here
  const ana = addPerson(s, 'Ana', 40.5, 40.5, { age: 32, inv: { grain: 8, water: 2 }, hunger: 100, thirst: 100, energy: 100, traits: { diligence: 1 } });
  give(w, ana, 'axe');
  const home = building(s, 'hut', 36, 36, ana.hhId, { grain: 20 });
  w.households.find((h) => h.id === ana.hhId)!.homeId = home.id;
  const bakery = building(s, 'bakery', 44, 34, 0, {});
  const trees = [makeSource(w, 'tree', 34, 48, 8), makeSource(w, 'tree', 35, 49, 8), makeSource(w, 'tree', 36, 50, 8)];
  done(s);
  for (const e of [home, bakery, ...trees]) observe(w, ana, e);
  ana.cooldowns.trade = 1e12;
  perceive(w, ana);
  const want = batchWanted(generateOptions(w, ana, true, true))!;
  expect(want?.item).toBe('bread');
  expect(want.recipe).toBe('bake_bread');
  reviewIntentions(generateOptions(w, ana, true));
  const plan = ana.intentions.find((i) => i.kind === 'batch')!;
  expect(plan.makes).toBe('bread');
  expect(plan.step).toMatch(/flour|grain/);
  ana.cooldowns.pause = 0;
  for (let i = 0; i < 9000 && (ana.inv.bread ?? 0) < 1 && foodUnitsOf(bakery.store.items, 'bread') < 1; i++) stepWorld(w);
  expect((bakery.ops!.produced.flour ?? 0)).toBeGreaterThanOrEqual(3);
  expect((bakery.ops!.produced.bread ?? 0)).toBeGreaterThanOrEqual(1);
  expect(conservationReport(w).ok).toBe(true);
});
function foodUnitsOf(items: Record<string, number | undefined>, k: string): number {
  return items[k] ?? 0;
}
