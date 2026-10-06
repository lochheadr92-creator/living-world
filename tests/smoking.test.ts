import { describe, expect, it } from 'vitest';
import { newActivity, startActivity } from '../src/sim/activities';
import { BUILD_DEF, DAY, NUTRITION, PERISHABLE, TOOL_DEFS, TOOL_EFFECT, WEIGHT } from '../src/sim/constants';
import { generateOptions } from '../src/sim/decision';
import { conservationReport } from '../src/sim/economy';
import { facilityTick, startJob, workJob } from '../src/sim/facilities';
import { observe } from '../src/sim/knowledge';
import { wantedTool } from '../src/sim/options_work';
import { makeCtx } from '../src/sim/optutil';
import { FACILITY_TYPES, RECIPE_BY_ID, acceptedAt, recipesAt, recipesMaking } from '../src/sim/recipes';
import { makeSource } from '../src/sim/sources';
import { toolReport, toolsHeldBy } from '../src/sim/toolreg';
import { dullness, lendTool, returnLoan, taskMultiplier, wearTool } from '../src/sim/tools';
import type { Building, Person, World } from '../src/sim/types';
import { spoilGoods } from '../src/sim/world';
import { addPerson, building, done, give, stage } from './helpers/kit';
import { run } from './helpers/util';

function work(w: World, b: Building, p: Person, max = 900): void {
  for (let i = 0; i < max; i++) {
    w.tick++;
    if (workJob(w, b, p) !== 'continue') return;
  }
}
function burn(w: World, b: Building, max = 2000): void {
  for (let i = 0; i < max && b.ops?.job; i++) {
    w.tick++;
    facilityTick(w, b);
  }
}

describe('adding a kind of building', () => {
  it('never moves the older kinds: their position in BUILD_DEF salts planning decisions, so reordering would change every world', () => {
    expect(Object.keys(BUILD_DEF).slice(0, 12)).toEqual(['lean_to', 'hut', 'house', 'storehouse', 'fire', 'timber_yard', 'quarry', 'kiln', 'smithy', 'granary', 'bakery', 'hall']);
    expect(Object.keys(BUILD_DEF)[12]).toBe('smokehouse');
  });
});

describe('smoked fish', () => {
  it('is a fair trade, not a free lunch: a little less hunger per fish than fresh, but it keeps for weeks and is lighter to carry', () => {
    const r = RECIPE_BY_ID.smoke_fish;
    const perFish = ((r.outputs.smoked_fish ?? 0) * NUTRITION.smoked_fish) / (r.inputs.fish ?? 1);
    expect(perFish).toBeLessThan(NUTRITION.fish); // smoking costs something
    expect(perFish / NUTRITION.fish).toBeGreaterThan(0.7); // but not most of it
    expect(PERISHABLE.smoked_fish ?? 99).toBeLessThan((PERISHABLE.fish ?? 0) / 5);
    expect(WEIGHT.smoked_fish).toBeLessThan(WEIGHT.fish);
    expect(r.waste.fish).toBe(1);
    expect(r.wasteWhy.length).toBeGreaterThan(5);
  });

  it('a batch uses four fish and a stick of wood, wastes one fish, makes three smoked fish, and every unit is in the ledger', () => {
    const s = stage('smoke-batch');
    const p = addPerson(s, 'Ola', 44, 44, { traits: { diligence: 0.9 } });
    const b = building(s, 'smokehouse', 50, 50, 0, { fish: 4, wood: 1 });
    const w = done(s);
    expect(startJob(w, b, p, RECIPE_BY_ID.smoke_fish, p.id, 'a test')).toBeNull();
    expect(b.store.items.fish).toBeUndefined(); // on the racks, still counted
    work(w, b, p);
    expect(b.ops!.job!.phase).toBe('burn');
    expect(w.ledger.reasons['-burned as fuel']).toBe(1); // the fire is lit once the work is done
    burn(w, b);
    expect(b.ops!.job).toBeNull();
    expect(b.store.items.smoked_fish).toBe(3);
    expect(w.ledger.reasons['-used in smoked fish']).toBe(3);
    expect(w.ledger.reasons['-wasted: water driven off by the smoke, and bones']).toBe(1);
    expect(w.ledger.reasons['+made smoked fish']).toBe(3);
    expect(b.ops!.wasted['water driven off by the smoke, and bones']).toBe(1);
    expect(b.ops!.earmarks.find((e) => e.item === 'smoked_fish')?.owner).toBe(p.id); // held for whoever ordered it
    expect(conservationReport(w).ok).toBe(true);
  });

  it('whoever fishes well smokes quicker: the recipe is worked at the pace of the fish skill', () => {
    const mk = (skill: number) => {
      const s = stage('smoke-skill-' + skill);
      const p = addPerson(s, 'Ola', 44, 44);
      p.skills.fish = skill;
      const b = building(s, 'smokehouse', 50, 50, 0, { fish: 4, wood: 1 });
      const w = done(s);
      startJob(w, b, p, RECIPE_BY_ID.smoke_fish, p.id, 'test');
      let n = 0;
      while (b.ops!.job?.phase === 'work' && n < 2000) {
        w.tick++;
        n++;
        workJob(w, b, p);
      }
      return n;
    };
    expect(mk(1.5)).toBeLessThan(mk(0.8));
  });

  it('keeps: in the same store, fresh fish goes off several times faster than smoked fish', () => {
    const s = stage('smoke-keeps');
    addPerson(s, 'Ola', 44, 44);
    const store = building(s, 'storehouse', 50, 50, 0, { fish: 40, smoked_fish: 40 });
    const w = done(s);
    for (let i = 0; i < 80; i++) spoilGoods(w); // about four days of spoilage checks
    const fishLost = 40 - (store.store.items.fish ?? 0);
    const smokedLost = 40 - (store.store.items.smoked_fish ?? 0);
    expect(w.ledger.spoiled.fish ?? 0).toBe(fishLost);
    expect(w.ledger.spoiled.smoked_fish ?? 0).toBe(smokedLost);
    expect(fishLost).toBeGreaterThan(smokedLost * 3);
    expect(conservationReport(w).ok).toBe(true);
  });

  it('the smokehouse is a workplace like the others: it has recipes, a store that takes what it works with, and is the only place that makes smoked fish', () => {
    expect(FACILITY_TYPES).toContain('smokehouse');
    expect(recipesAt('smokehouse').map((r) => r.id)).toEqual(['smoke_fish']);
    expect(recipesMaking('smoked_fish').map((r) => r.at)).toEqual(['smokehouse']);
    const takes = acceptedAt('smokehouse');
    for (const k of ['fish', 'wood', 'smoked_fish'] as const) expect(takes).toContain(k);
    expect(takes).not.toContain('bricks');
    expect(acceptedAt('hall')).toContain('smoked_fish'); // it can be served at a shared meal
  });

  it('a person with spare fish and a smokehouse they know of carries the fish there and smokes it, with nothing but the first nudge', () => {
    const s = stage('smoke-plan');
    const p = addPerson(s, 'Ola', 44, 44, { inv: { fish: 6, wood: 2 }, traits: { diligence: 0.8 } });
    const b = building(s, 'smokehouse', 48, 46, 0);
    const w = done(s);
    observe(w, p, b);
    const first = generateOptions(w, p).options.find((o) => o.kind === 'deposit' && o.targetId === b.id && o.make);
    expect(first, 'an option to take the fish to the smokehouse').toBeTruthy();
    expect(first!.label).toMatch(/4 fish and 1 wood/); // exactly what one batch takes, not everything they carry
    startActivity(w, p, first!.make!()!);
    run(w, 800);
    // the planner carried on by itself: the batch was started, worked, burned and finished
    expect(b.store.items.smoked_fish).toBe(3);
    expect(p.inv.fish ?? 0).toBeLessThanOrEqual(2); // only the two fish a batch could not use were kept back (and may since have been eaten)
    expect(w.ledger.reasons['+made smoked fish']).toBe(3);
    expect(w.ledger.reasons['-burned as fuel']).toBe(1);
    expect(conservationReport(w).ok).toBe(true);
    expect(toolReport(w).ok).toBe(true);
  });

  it('nobody is sent to the smokehouse without spare fish: the want is bounded', () => {
    const s = stage('smoke-nofish');
    const p = addPerson(s, 'Ola', 44, 44, { inv: { fish: 1, wood: 2 } });
    const b = building(s, 'smokehouse', 48, 46, 0);
    const w = done(s);
    observe(w, p, b);
    const opts = generateOptions(w, p).options.filter((o) => o.targetId === b.id && (o.kind === 'deposit' || o.kind === 'operate'));
    expect(opts).toEqual([]);
  });
});

describe('the fishing rod', () => {
  it('is made by hand from wood alone, speeds up fishing and nothing else, and wears like any tool', () => {
    expect(TOOL_DEFS.rod.hand?.cost).toEqual({ wood: 3 });
    const s = stage('rod-effect');
    const a = addPerson(s, 'Ann', 44, 44);
    const c = addPerson(s, 'Cal', 45, 44);
    const rod = give(s.w, c, 'rod');
    const w = done(s);
    expect(taskMultiplier(w, a, 'fish')).toBe(1);
    expect(taskMultiplier(w, c, 'fish')).toBeCloseTo(TOOL_EFFECT.rod, 5);
    expect(taskMultiplier(w, c, 'chop')).toBe(1); // a rod fells no trees
    wearTool(w, rod, 1000);
    expect(rod.wear).toBeGreaterThan(0);
    rod.wear = 90;
    expect(taskMultiplier(w, c, 'fish')).toBeGreaterThan(TOOL_EFFECT.rod);
    expect(dullness(90)).toBeGreaterThan(0);
    rod.wear = 99.9;
    expect(wearTool(w, rod, 100)).toBe(true);
    expect(toolsHeldBy(w, c.id, 'rod')).toHaveLength(0);
    expect(w.ledger.reasons['-tool worn out']).toBe(1);
    expect(toolReport(w).ok).toBe(true);
    expect(conservationReport(w).ok).toBe(true);
  });

  it('a fisher with a rod lands fish sooner, and the rod is worn by it', () => {
    const timeToFive = (rod: boolean) => {
      const s = stage('rod-catch');
      const p = addPerson(s, 'Fay', 44.5, 16.5);
      p.skills.fish = 1; // the same hands either way
      const t = rod ? give(s.w, p, 'rod') : null;
      const spot = makeSource(s.w, 'fish_spot', 44, 14, 30);
      const w = done(s);
      observe(w, p, spot);
      startActivity(w, p, newActivity(w, p, { kind: 'gather', label: 'Fishing', goal: 'test', targetId: spot.id, targetType: 'source', tx: 44.5, ty: 14.5, spotX: 44.5, spotY: 15.5, amount: 20, utility: 50, minCommit: 600, maxTicks: 900, data: { purpose: 'stock', stype: 'fish_spot' } }));
      let n = 0;
      while ((p.inv.fish ?? 0) < 5 && n < 900) {
        run(w, 1);
        n++;
      }
      return { n, wear: t?.wear ?? 0, w };
    };
    const bare = timeToFive(false);
    const rodded = timeToFive(true);
    expect(bare.n).toBeGreaterThan(150);
    expect(rodded.n).toBeLessThan(bare.n * 0.85);
    expect(rodded.wear).toBeGreaterThan(0);
    expect(conservationReport(rodded.w).ok).toBe(true);
  });

  it('someone who has taken to fishing wants a rod; someone who has not does not', () => {
    const mk = (skill: number, spots: number) => {
      const s = stage(`rod-want-${skill}-${spots}`);
      const p = addPerson(s, 'Fay', 44, 20);
      for (const t of ['axe', 'pick', 'hoe', 'basket', 'hammer', 'saw'] as const) give(s.w, p, t);
      p.skills.fish = skill;
      p.stats.gathered = 30;
      const srcs = Array.from({ length: spots }, (_, i) => makeSource(s.w, 'fish_spot', 40 + i * 2, 14, 10));
      const w = done(s);
      for (const e of srcs) observe(w, p, e);
      return wantedTool(makeCtx(w, p, false));
    };
    expect(mk(1.25, 1)).toBe('rod');
    expect(mk(1.25, 0)).toBeNull(); // no known fishing place
    expect(mk(0.8, 1)).toBeNull(); // never took to it
  });

  it('can be lent like any other tool', () => {
    const s = stage('rod-lend');
    const a = addPerson(s, 'Ann', 44, 44);
    const c = addPerson(s, 'Cal', 45, 44);
    const rod = give(s.w, a, 'rod');
    const w = done(s);
    expect(toolReport(w).ok).toBe(true);
    expect(rod.holder).toBe(a.id);
    expect(lendTool(w, rod, a, c, w.tick + 1000)).toBe(true);
    expect(toolReport(w).ok).toBe(true);
    expect(returnLoan(w, rod, c, a)).toBe(true);
    expect(toolReport(w).ok).toBe(true);
  });
});
