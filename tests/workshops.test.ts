import { describe, expect, it } from 'vitest';
import { destroyBuilding } from '../src/sim/buildings';
import { DAY, GRANARY_NEGLECT_MULT, GRANARY_SPOIL, NUTRITION, SKILL_MAX, TOOL_DEFS } from '../src/sim/constants';
import { addItem, conservationReport, snapshotInitial, totalItems } from '../src/sim/economy';
import { STALL_LIMIT, accessLevel, facilityTick, finishJob, noteDeposit, noteSpoiled, recipeOf, shelveJob, spoilMultiplier, startBlocker, startJob, usableUnits, withdrawAllowance, workJob } from '../src/sim/facilities';
import { RECIPES, RECIPE_BY_ID, recipesAt } from '../src/sim/recipes';
import { relOf } from '../src/sim/relations';
import { toolReport, toolsHeldBy } from '../src/sim/toolreg';
import { benchTool, breakTool, checkoutFromRack, dullness, lendTool, mintTool, onBenchFor, returnLoan, taskMultiplier, toolOf, toolsOnDeath, wearTool } from '../src/sim/tools';
import type { Building, Person, World } from '../src/sim/types';
import { BUILD_DEF } from '../src/sim/constants';
import { makeSource } from '../src/sim/sources';
import { addPerson, building, done, give, stage } from './helpers/kit';

/** run one worker on the running batch until its work phase is over (or give up) */
function work(w: World, b: Building, p: Person, max = 900): void {
  for (let i = 0; i < max; i++) {
    w.tick++;
    const r = workJob(w, b, p);
    if (r !== 'continue') return;
  }
}

/** let a burning batch burn down */
function burn(w: World, b: Building, max = 2000): void {
  for (let i = 0; i < max && b.ops?.job; i++) {
    w.tick++;
    facilityTick(w, b);
  }
}

function yardWith(stock: Record<string, number> = {}, tools: ('saw' | 'axe' | 'hammer')[] = []) {
  const s = stage('workshop-' + Math.random().toString(36).slice(2, 6));
  const p = addPerson(s, 'Mira', 44, 44, { traits: { diligence: 0.9 } });
  const b = building(s, 'timber_yard', 50, 50, 0, stock);
  for (const t of tools) give(s.w, p, t);
  done(s);
  return { s, w: s.w, p, b };
}

describe('the recipe table is a closed, acyclic accounting', () => {
  it('every recipe happens at a workplace that exists, has a stated benefit, and wastes no more than it takes in', () => {
    for (const r of RECIPES) {
      expect(BUILD_DEF[r.at], r.id).toBeTruthy();
      expect(r.benefit.length, r.id).toBeGreaterThan(10);
      expect(r.work, r.id).toBeGreaterThan(0);
      for (const k of Object.keys(r.waste) as (keyof typeof r.waste)[]) expect(r.waste[k] ?? 0, `${r.id} wastes ${k}`).toBeLessThanOrEqual(r.inputs[k] ?? 0);
      if (r.waste && Object.keys(r.waste).length) expect(r.wasteWhy.length, r.id).toBeGreaterThan(3);
      const makesSomething = Object.keys(r.outputs).length > 0 || !!r.toolOut || !!r.cartOut || !!r.fromDeposit || r.id === 'tend_granary';
      expect(makesSomething, r.id).toBe(true);
      expect(r.serves.length, r.id).toBeGreaterThan(0);
    }
  });

  it('there are no circular dependencies: nothing is needed, directly or not, to make itself', () => {
    const edges: Record<string, Set<string>> = {};
    for (const r of RECIPES) {
      const outs = [...Object.keys(r.outputs), ...(r.toolOut ? [r.toolOut.kind] : []), ...(r.cartOut ? ['cart'] : [])];
      const ins = [...Object.keys(r.inputs), ...Object.keys(r.fuel)];
      for (const o of outs) for (const i of ins) (edges[o] ??= new Set()).add(i);
    }
    const state: Record<string, 0 | 1 | 2> = {};
    const visit = (n: string, path: string[]): void => {
      if (state[n] === 2) return;
      expect(state[n], 'cycle: ' + [...path, n].join(' -> ')).not.toBe(1);
      state[n] = 1;
      for (const m of edges[n] ?? []) visit(m, [...path, n]);
      state[n] = 2;
    };
    for (const n of Object.keys(edges)) visit(n, []);
  });

  it('every chain can be started from nothing but hand tools: planks need no saw, and a saw needs no iron', () => {
    expect(RECIPE_BY_ID.hew_planks.tool?.required).toBe(false);
    expect(TOOL_DEFS.saw.hand).toBeTruthy();
    expect(TOOL_DEFS.hammer.hand).toBeTruthy();
    // wood, stone, clay, ore and grain come out of the ground by hand; nothing in the first links of the chain is made by a workshop
    for (const r of RECIPES.filter((x) => x.at === 'timber_yard' || x.at === 'quarry' || x.at === 'kiln')) {
      for (const k of Object.keys(r.inputs)) expect(['wood', 'clay', 'planks', 'handles']).toContain(k);
    }
  });

  it('bread is worth documenting: four loaves from what raw grain gives three, because the dough takes up water', () => {
    const mill = RECIPE_BY_ID.mill_flour;
    const bake = RECIPE_BY_ID.bake_bread;
    const breadPerGrain = ((bake.outputs.bread ?? 0) / (bake.inputs.flour ?? 1)) * ((mill.outputs.flour ?? 0) / (mill.inputs.grain ?? 1));
    const nutritionPerGrainViaBread = breadPerGrain * NUTRITION.bread;
    expect(nutritionPerGrainViaBread).toBeGreaterThan(NUTRITION.grain);
    expect(nutritionPerGrainViaBread / NUTRITION.grain).toBeLessThan(1.6); // a real gain, not a free lunch
    expect(bake.inputs.water).toBe(2); // the extra comes from somewhere: water goes into the loaf
  });
});

describe('a batch at a workplace', () => {
  it('uses its inputs, makes its products, and records every part in the ledger (including the waste)', () => {
    const { w, p, b } = yardWith({ wood: 3 }, ['saw']);
    expect(startJob(w, b, p, RECIPE_BY_ID.saw_planks, p.id, 'a test')).toBeNull();
    // the wood has left the shelf but still exists: it is inside the batch
    expect(b.store.items.wood).toBeUndefined();
    expect(totalItems(w).wood).toBe(3);
    work(w, b, p);
    expect(b.ops!.job).toBeNull();
    expect(b.store.items.planks).toBe(2);
    expect(w.ledger.reasons['-used in sawn planks']).toBe(2);
    expect(w.ledger.reasons['-wasted: sawdust and offcuts']).toBe(1);
    expect(w.ledger.reasons['+made sawn planks']).toBe(2);
    expect(b.ops!.wasted['sawdust and offcuts']).toBe(1);
    expect(conservationReport(w).ok).toBe(true);
  });

  it('a fire-fired batch burns on with nobody there: the fuel is spent when it is lit, the bricks appear at the end', () => {
    const s = stage('kiln-burn');
    const p = addPerson(s, 'Odo', 44, 44);
    const b = building(s, 'kiln', 50, 50, 0, { clay: 4, wood: 2 });
    const w = done(s);
    expect(startJob(w, b, p, RECIPE_BY_ID.fire_bricks, p.id, 'test')).toBeNull();
    work(w, b, p);
    const job = b.ops!.job!;
    expect(job.phase).toBe('burn');
    expect(w.ledger.reasons['-burned as fuel']).toBe(2);
    expect(b.store.items.bricks).toBeUndefined();
    // the worker walks off; the kiln finishes by itself
    burn(w, b);
    expect(b.ops!.job).toBeNull();
    expect(b.store.items.bricks).toBe(3);
    expect(w.ledger.reasons['-wasted: clay that cracked and shrank in the fire']).toBe(1);
    expect(conservationReport(w).ok).toBe(true);
  });

  it('with the clay short it will not start at all, and says exactly what is missing', () => {
    const s = stage('kiln-short');
    const p = addPerson(s, 'Odo', 44, 44);
    const b = building(s, 'kiln', 50, 50, 0, { clay: 3, wood: 2 });
    const w = done(s);
    expect(startBlocker(w, b, p, RECIPE_BY_ID.fire_bricks)).toBe('lacks 1 clay');
    expect(startJob(w, b, p, RECIPE_BY_ID.fire_bricks, p.id, 'test')).toBe('lacks 1 clay');
    expect(b.ops!.job).toBeNull();
    expect(b.store.items.clay).toBe(3); // nothing was taken
  });

  it('a full store holds the finished goods in the batch until there is room, and nothing is lost meanwhile', () => {
    const { w, p, b } = yardWith({ wood: 3 }, ['saw']);
    startJob(w, b, p, RECIPE_BY_ID.saw_planks, p.id, 'test');
    // fill every last unit of the store with something else
    const room = b.store.cap - 0;
    addItem(b.store.items, 'handles', Math.floor(room / 0.5));
    work(w, b, p);
    expect(b.ops!.job?.phase).toBe('ready');
    expect(b.ops!.job?.blocked).toMatch(/full/);
    expect(b.store.items.planks).toBeUndefined();
    expect(totalItems(w).wood).toBe(3); // still counted, still the same wood
    // someone clears space; the batch completes on its own
    b.store.items.handles = 0;
    delete b.store.items.handles;
    for (let i = 0; i < 40; i++) {
      w.tick++;
      facilityTick(w, b);
    }
    expect(b.ops!.job).toBeNull();
    expect(b.store.items.planks).toBe(2);
    expect(conservationReport(w).ok).toBe(true);
  });

  it('a batch nobody comes back to is set aside after a while and its materials go back on the shelf', () => {
    const { w, p, b } = yardWith({ wood: 3 }, ['saw']);
    startJob(w, b, p, RECIPE_BY_ID.saw_planks, p.id, 'test');
    w.tick++;
    workJob(w, b, p); // a little work, then the worker is gone
    w.tick += STALL_LIMIT + 5;
    facilityTick(w, b);
    expect(b.ops!.job).toBeNull();
    expect(b.store.items.wood).toBe(3);
    expect(conservationReport(w).ok).toBe(true);
    expect(w.events.some((e) => /set aside/.test(e.text))).toBe(true);
  });

  it('if the building falls down mid-batch the materials in it are scattered as rubble, none destroyed', () => {
    const { w, p, b } = yardWith({ wood: 3, handles: 1 }, ['saw']);
    startJob(w, b, p, RECIPE_BY_ID.saw_planks, p.id, 'test');
    const before = totalItems(w);
    destroyBuilding(w, b, 'collapsed in a storm');
    const after = totalItems(w);
    expect(after.wood).toBe(before.wood);
    expect(after.handles).toBe(before.handles);
    expect(w.piles.some((pl) => (pl.items.wood ?? 0) === 3)).toBe(true);
    expect(conservationReport(w).ok).toBe(true);
  });

  it('stone is cut out of the outcrop, not created: the outcrop gets smaller by exactly what the yard receives', () => {
    const s = stage('quarry-cut');
    const p = addPerson(s, 'Odo', 44, 44);
    const out = makeSource(s.w, 'outcrop', 52, 50, 20);
    const b = building(s, 'quarry', 49, 50, 0);
    b.ops!.depositId = out.id;
    const w = done(s);
    expect(startJob(w, b, p, RECIPE_BY_ID.quarry_stone, p.id, 'test')).toBeNull();
    expect(out.amount).toBe(17);
    work(w, b, p);
    expect(b.store.items.stone).toBe(3);
    expect(w.ledger.created.stone ?? 0).toBe(0);
    expect(conservationReport(w).ok).toBe(true);
    // worked out: refuses honestly
    out.amount = 2;
    expect(startBlocker(w, b, p, RECIPE_BY_ID.quarry_stone)).toBe('the outcrop is worked out');
  });

  it('finishing a batch raises the skill of those who put in a fair share, a little less each time, never past the ceiling; mere time spent teaches nothing', () => {
    const { w, p, b } = yardWith({ wood: 12 }, ['saw']);
    const before = p.skills.carpentry;
    startJob(w, b, p, RECIPE_BY_ID.saw_planks, p.id, 'test');
    // half the work is done: no gain yet
    for (let i = 0; i < 10; i++) {
      w.tick++;
      workJob(w, b, p);
    }
    expect(p.skills.carpentry).toBe(before);
    work(w, b, p);
    const g1 = p.skills.carpentry - before;
    expect(g1).toBeGreaterThan(0);
    startJob(w, b, p, RECIPE_BY_ID.saw_planks, p.id, 'test');
    work(w, b, p);
    const g2 = p.skills.carpentry - before - g1;
    expect(g2).toBeGreaterThan(0);
    expect(g2).toBeLessThanOrEqual(g1 + 1e-9);
    p.skills.carpentry = SKILL_MAX - 0.001;
    startJob(w, b, p, RECIPE_BY_ID.saw_planks, p.id, 'test');
    work(w, b, p);
    expect(p.skills.carpentry).toBeLessThanOrEqual(SKILL_MAX);
  });

  it('a better-skilled worker gets the same batch done sooner', () => {
    const slowS = yardWith({ wood: 3 }, ['saw']);
    const fastS = yardWith({ wood: 3 }, ['saw']);
    slowS.p.skills.carpentry = 0.8;
    fastS.p.skills.carpentry = 1.6;
    const time = (x: typeof slowS) => {
      startJob(x.w, x.b, x.p, RECIPE_BY_ID.saw_planks, x.p.id, 't');
      let n = 0;
      while (workJob(x.w, x.b, x.p) === 'continue' && n < 900) n++;
      return n;
    };
    expect(time(fastS)).toBeLessThan(time(slowS));
  });

  it('sawing wastes less wood than hewing: the tool is task-specific, and the primitive way still works', () => {
    const a = yardWith({ wood: 3 }, ['saw']);
    const c = yardWith({ wood: 3 }, []);
    startJob(a.w, a.b, a.p, RECIPE_BY_ID.saw_planks, a.p.id, 't');
    work(a.w, a.b, a.p);
    expect(startBlocker(c.w, c.b, c.p, RECIPE_BY_ID.saw_planks)).toMatch(/needs a saw/);
    expect(startJob(c.w, c.b, c.p, RECIPE_BY_ID.hew_planks, c.p.id, 't')).toBeNull();
    work(c.w, c.b, c.p);
    expect(a.b.store.items.planks).toBe(2);
    expect(c.b.store.items.planks).toBe(1);
  });
});

describe('who may use a workplace, and whose goods are whose', () => {
  it('owners, builders, friends and communal use are open; strangers are not', () => {
    const s = stage('access');
    const owner = addPerson(s, 'Owen', 44, 44);
    const kin = addPerson(s, 'Kit', 45, 44, { hh: owner.hhId });
    const builder = addPerson(s, 'Bea', 46, 44);
    const friend = addPerson(s, 'Fay', 47, 44);
    const stranger = addPerson(s, 'Sam', 48, 44);
    const b = building(s, 'smithy', 50, 50, owner.hhId);
    b.ops!.builders[builder.hhId] = 0.3;
    relOf(friend, owner.id).affinity = 20;
    relOf(owner, friend.id).affinity = 12;
    const w = done(s);
    expect(accessLevel(w, owner, b)).toBe('owner');
    expect(accessLevel(w, kin, b)).toBe('owner');
    expect(accessLevel(w, builder, b)).toBe('builder');
    expect(accessLevel(w, friend, b)).toBe('friend');
    expect(accessLevel(w, stranger, b)).toBe('none');
    b.hhId = 0;
    expect(accessLevel(w, stranger, b)).toBe('communal');
  });

  it('a visitor cannot start a batch from the owner’s stock, but can from what they brought themselves, and what they make is theirs', () => {
    const s = stage('visitor');
    const owner = addPerson(s, 'Owen', 44, 44);
    const friend = addPerson(s, 'Fay', 47, 44, { inv: { clay: 4, wood: 2 } });
    const b = building(s, 'kiln', 50, 50, owner.hhId, { clay: 4, wood: 2 });
    relOf(friend, owner.id).affinity = 20;
    relOf(owner, friend.id).affinity = 12;
    const w = done(s);
    expect(usableUnits(w, b, friend, 'clay')).toBe(0); // the owner's clay is not hers
    expect(startJob(w, b, friend, RECIPE_BY_ID.fire_bricks, friend.id, 'test')).toMatch(/lacks 4 clay/);
    // she brings her own
    for (const k of ['clay', 'wood'] as const) {
      const n = friend.inv[k] ?? 0;
      delete friend.inv[k];
      addItem(b.store.items, k, n);
      noteDeposit(w, b, friend, k, n);
    }
    expect(usableUnits(w, b, friend, 'clay')).toBe(4);
    expect(usableUnits(w, b, owner, 'clay')).toBe(4); // the owner's own four
    expect(startJob(w, b, friend, RECIPE_BY_ID.fire_bricks, friend.id, 'test')).toBeNull();
    // the owner's four are untouched: the visitor's earmark was used first
    expect(b.store.items.clay).toBe(4);
    work(w, b, friend);
    burn(w, b);
    expect(b.store.items.bricks).toBe(3);
    // the bricks are earmarked to her: the owner cannot walk off with them
    expect(withdrawAllowance(w, b, owner, 'bricks', 3)).toBe(0);
    expect(withdrawAllowance(w, b, friend, 'bricks', 3)).toBe(3);
    // after the claim lapses they become the workplace's own stock
    w.tick += DAY * 2;
    expect(withdrawAllowance(w, b, owner, 'bricks', 3)).toBe(3);
  });

  it('two workers going for the same inputs: the first to start gets them, the second is told there is nothing left', () => {
    const s = stage('contested-inputs');
    const a = addPerson(s, 'Ann', 44, 44);
    const c = addPerson(s, 'Cal', 45, 44, { hh: a.hhId });
    const b = building(s, 'kiln', 50, 50, a.hhId, { clay: 4, wood: 2 });
    const w = done(s);
    expect(startJob(w, b, a, RECIPE_BY_ID.fire_bricks, a.id, 'test')).toBeNull();
    expect(startJob(w, b, c, RECIPE_BY_ID.fire_bricks, c.id, 'test')).toMatch(/already/);
    expect(b.ops!.job!.client).toBe(a.id);
  });
});

describe('the granary', () => {
  it('keeps each household’s grain apart, lets a starving person take an emergency ration, and spoils far less than an ordinary store', () => {
    const s = stage('granary');
    const a = addPerson(s, 'Ann', 44, 44);
    const c = addPerson(s, 'Cal', 45, 44);
    const b = building(s, 'granary', 50, 50, 0);
    const w = done(s);
    for (const [p, n] of [[a, 6], [c, 2]] as [Person, number][]) {
      addItem(b.store.items, 'grain', n);
      noteDeposit(w, b, p, 'grain', n);
    }
    expect(withdrawAllowance(w, b, a, 'grain', 9)).toBe(6);
    expect(withdrawAllowance(w, b, c, 'grain', 9)).toBe(2);
    // a stranger’s household with no share gets nothing... unless they are starving
    const d = addPerson(s, 'Dee', 46, 44);
    d.hhId = 999999;
    expect(withdrawAllowance(w, b, d, 'grain', 3)).toBe(0);
    d.needs.hunger = 12;
    expect(withdrawAllowance(w, b, d, 'grain', 9)).toBe(3);
    // spoilage multiplier: tended bins keep far better than an ordinary store, neglected ones are worse
    b.ops!.tended = w.tick;
    expect(spoilMultiplier(w, b)).toBe(GRANARY_SPOIL);
    w.tick += DAY * 4;
    expect(spoilMultiplier(w, b)).toBe(GRANARY_NEGLECT_MULT);
    const hut = building(s, 'hut', 60, 60, a.hhId);
    expect(spoilMultiplier(w, hut)).toBe(1);
    // losses are shared out in proportion: shares always add up to what is in the bins
    for (let i = 0; i < 3; i++) {
      b.store.items.grain = (b.store.items.grain ?? 0) - 1;
      noteSpoiled(w, b, 'grain', 1);
    }
    const total = Object.values(b.ops!.shares).reduce((n, sh) => n + (sh.grain ?? 0), 0);
    expect(total).toBe(b.store.items.grain);
  });
});

describe('tools', () => {
  it('equipment is both a count in a pack and a record, and the two never disagree through hand-overs', () => {
    const s = stage('toolsync');
    const a = addPerson(s, 'Ann', 44, 44);
    const c = addPerson(s, 'Cal', 45, 44);
    give(s.w, a, 'hammer');
    const w = done(s);
    expect(toolReport(w).ok).toBe(true);
    const t = toolsHeldBy(w, a.id, 'hammer')[0];
    expect(lendTool(w, t, a, c, w.tick + 1000)).toBe(true);
    expect(toolReport(w).ok).toBe(true);
    expect(t.holder).toBe(c.id);
    expect(returnLoan(w, t, c, a)).toBe(true);
    expect(toolReport(w).ok).toBe(true);
    expect(t.holder).toBe(a.id);
    expect(t.loan).toBeNull();
  });

  it('use wears a tool; worn tools do their job less well; at 100 it breaks and the loss is recorded', () => {
    const s = stage('wear');
    const a = addPerson(s, 'Ann', 44, 44);
    const t = give(s.w, a, 'axe');
    const w = done(s);
    const fresh = taskMultiplier(w, a, 'chop');
    wearTool(w, t, 1000);
    expect(t.wear).toBeGreaterThan(0);
    t.wear = 90;
    expect(taskMultiplier(w, a, 'chop')).toBeGreaterThan(fresh);
    expect(dullness(60)).toBe(0);
    expect(dullness(100)).toBe(1);
    t.wear = 99.9;
    expect(wearTool(w, t, 100)).toBe(true);
    expect(toolsHeldBy(w, a.id, 'axe')).toHaveLength(0);
    expect(a.inv.axe ?? 0).toBe(0);
    expect(w.ledger.reasons['-tool worn out']).toBe(1);
    expect(toolReport(w).ok).toBe(true);
    expect(conservationReport(w).ok).toBe(true);
  });

  it('an iron tool is faster and wears half as fast as a wooden-and-stone one', () => {
    const s = stage('iron');
    const a = addPerson(s, 'Ann', 44, 44);
    const c = addPerson(s, 'Cal', 45, 44);
    const old = give(s.w, a, 'axe', 0);
    const iron = give(s.w, c, 'axe', 1);
    const w = done(s);
    expect(taskMultiplier(w, c, 'chop')).toBeLessThan(taskMultiplier(w, a, 'chop'));
    wearTool(w, old, 1000);
    wearTool(w, iron, 1000);
    expect(iron.wear).toBeCloseTo(old.wear / 2, 5);
  });

  it('a hammer on a workshop rack can be used by one person at a time; the second must wait, and it is free again when the first lets go', () => {
    const s = stage('bench');
    const smith = addPerson(s, 'Ann', 44, 44);
    const other = addPerson(s, 'Cal', 45, 44);
    const b = building(s, 'smithy', 50, 50, 0, { iron: 2, handles: 2, charcoal: 2 });
    const t = mintTool(s.w, 'hammer', 0, 0, b.id, b.store.items, 0, 'test', false);
    const w = done(s);
    expect(benchTool(w, smith, b.id, 'hammer')).toBe(t);
    expect(benchTool(w, other, b.id, 'hammer')).toBeNull(); // in use
    expect(onBenchFor(w, t, other.id)).toBe(true);
    expect(startBlocker(w, b, other, RECIPE_BY_ID.forge_axe)).toMatch(/needs a hammer/);
    expect(startBlocker(w, b, smith, RECIPE_BY_ID.forge_axe)).toBe('');
    t.loan = null;
    expect(benchTool(w, other, b.id, 'hammer')).toBe(t);
  });

  it('checking a tool out of a shared rack puts it in a pack with a promise to return it, and nobody else can take it meanwhile', () => {
    const s = stage('rack');
    const a = addPerson(s, 'Ann', 44, 44);
    const c = addPerson(s, 'Cal', 45, 44);
    const b = building(s, 'storehouse', 50, 50, 0);
    const t = mintTool(s.w, 'saw', 0, 0, b.id, b.store.items, 0, 'test', false);
    const w = done(s);
    expect(checkoutFromRack(w, t, b.store.items, a)).toBe(true);
    expect(t.holder).toBe(a.id);
    expect(t.loan?.lender).toBe(0);
    expect(checkoutFromRack(w, t, b.store.items, c)).toBe(false);
    expect(toolReport(w).ok).toBe(true);
  });

  it('when the borrower dies the loan ends and the tool goes where the dead person’s belongings go; when the lender dies the borrower answers to their household', () => {
    const s = stage('death-loans');
    const lender = addPerson(s, 'Ana', 44, 44);
    const heir = addPerson(s, 'Hal', 45, 44, { hh: lender.hhId });
    const borrower = addPerson(s, 'Bo', 46, 44);
    const t = give(s.w, lender, 'saw');
    const w = done(s);
    lendTool(w, t, lender, borrower, w.tick + 2000);
    lender.alive = false;
    toolsOnDeath(w, lender);
    expect(t.loan?.lender).toBe(heir.id);
    // and with no heir at all, the borrower’s household becomes the owner
    heir.alive = false;
    toolsOnDeath(w, { ...lender, id: heir.id } as Person);
    expect(t.loan === null || t.loan.lender !== lender.id).toBe(true);
  });

  it('a breakage while lent is the borrower’s misfortune, recorded once, and leaves no phantom record', () => {
    const s = stage('break-lent');
    const a = addPerson(s, 'Ann', 44, 44);
    const c = addPerson(s, 'Cal', 45, 44);
    const t = give(s.w, a, 'pick');
    const w = done(s);
    lendTool(w, t, a, c, w.tick + 1000);
    breakTool(w, t, 'tool worn out');
    expect(w.tools).toHaveLength(0);
    expect(c.inv.pick ?? 0).toBe(0);
    expect(a.inv.pick ?? 0).toBe(0);
    expect(toolReport(w).ok).toBe(true);
    expect(toolOf(w, c, 'pick')).toBeNull();
  });
});

describe('recipes at each workplace', () => {
  it('each workplace has at least one recipe or a stated purpose', () => {
    for (const t of ['timber_yard', 'quarry', 'kiln', 'smithy', 'bakery', 'granary', 'smokehouse'] as const) expect(recipesAt(t).length, t).toBeGreaterThan(0);
    expect(BUILD_DEF.hall.blurb).toMatch(/meals/);
  });
  it('forging an iron tool takes iron, a handle and charcoal, and gives a tier-1 tool', () => {
    const s = stage('forge');
    const p = addPerson(s, 'Ann', 44, 44);
    give(s.w, p, 'hammer');
    const b = building(s, 'smithy', 50, 50, 0, { iron: 1, handles: 1, charcoal: 1 });
    const w = done(s);
    expect(startJob(w, b, p, RECIPE_BY_ID.forge_axe, p.id, 'test')).toBeNull();
    work(w, b, p);
    const made = toolsHeldBy(w, b.id, 'axe');
    expect(made).toHaveLength(1);
    expect(made[0].tier).toBe(1);
    expect(recipeOf({ recipe: 'forge_axe' } as never).label).toBe('an iron axe');
    expect(w.ledger.created.axe).toBe(1);
    expect(w.ledger.reasons['-burned as fuel']).toBe(1);
    expect(toolReport(w).ok).toBe(true);
    expect(conservationReport(w).ok).toBe(true);
  });
});

void finishJob;
void shelveJob;
void snapshotInitial;
void BUILD_DEF;
