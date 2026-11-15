// Rules 249: a full oven (src/sim/oven_load.ts, recipes.ts OVEN_RECIPES, startJob in facilities.ts). A milling or a firing takes the
// largest of three measures the workshop's shelves hold. STAGED: a bakery and one worker; the ordinary-world evidence is the paired lab.
// Tests that name a rules-248 contrast fail if the rule is taken out (or the world is 248).
import { afterEach, describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { conservationReport } from '../src/sim/economy';
import { facilityTick, facilitySnapshot, recipeOf, resumableJob, startJob, workJob } from '../src/sim/facilities';
import { fullLoadNeed, hasOvenLoad, largerBatches, setOvenLoad } from '../src/sim/oven_load';
import { RECIPES, RECIPE_BY_ID, recipesMaking } from '../src/sim/recipes';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { techniqueOfRecipe } from '../src/sim/techniques';
import { stepWorld } from '../src/sim/world';
import { parseIntervention } from '../scripts/lab/lab';
import type { Building, Person, World } from '../src/sim/types';
import { addPerson, building, done, stage } from './helpers/kit';

afterEach(() => setOvenLoad(true));

function bakery(stock: Record<string, number>, rules = 249, type: 'bakery' | 'mill' = 'bakery') {
  const s = stage('oven-' + rules);
  s.w.settings.dynamics = 'rich';
  s.w.settings.rulesVersion = rules;
  const p = addPerson(s, 'Mira', 44, 44, { traits: { diligence: 0.9 } });
  const b = building(s, type, 50, 50, 0, stock);
  done(s);
  return { w: s.w, p, b };
}
function work(w: World, b: Building, p: Person, max = 3000): void {
  for (let i = 0; i < max; i++) {
    w.tick++;
    const r = workJob(w, b, p);
    if (r === 'stopped' || r === 'missing_tool' || !b.ops?.job || b.ops.job.phase !== 'work') return;
  }
}
function burn(w: World, b: Building, max = 3000): void {
  for (let i = 0; i < max && b.ops?.job; i++) {
    w.tick++;
    facilityTick(w, b);
  }
}
const begun = (stock: Record<string, number>, recipe: string, rules = 249, type: 'bakery' | 'mill' = 'bakery') => {
  const f = bakery(stock, rules, type);
  expect(startJob(f.w, f.b, f.p, RECIPE_BY_ID[recipe], f.p.id, 'test')).toBeNull();
  return { ...f, job: f.b.ops!.job! };
};

describe('rules 249: the largest batch the shelves cover', () => {
  it('rules 249 is a supported, current version', () => {
    expect(SUPPORTED_RULES_VERSIONS).toContain(249);
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(249);
  });

  it('milling takes 4, 8 or 12 grain to 3, 6 or 9 flour, the largest the shelf covers', () => {
    expect(begun({ grain: 4 }, 'mill_flour').job.recipe).toBe('mill_flour');
    expect(begun({ grain: 7 }, 'mill_flour').job.recipe).toBe('mill_flour');
    expect(begun({ grain: 8 }, 'mill_flour').job.recipe).toBe('mill_flour_x2');
    expect(begun({ grain: 11 }, 'mill_flour').job.recipe).toBe('mill_flour_x2');
    const big = begun({ grain: 12 }, 'mill_flour');
    expect(big.job.recipe).toBe('mill_flour_x3');
    expect(big.job.total).toBe(140);
    expect(big.b.store.items.grain).toBeUndefined();
    work(big.w, big.b, big.p);
    expect(big.b.ops!.job).toBeNull();
    expect(big.b.store.items.flour).toBe(9);
    expect(big.w.ledger.reasons['+made milled flour']).toBe(9);
    expect(big.w.ledger.reasons['-wasted: husks and chaff']).toBe(3);
    expect(conservationReport(big.w).ok).toBe(true);
  });

  it('the separate mill takes 6, 12 or 18 grain to 5, 10 or 15 flour', () => {
    const f = begun({ grain: 18 }, 'mill_flour_separate', 249, 'mill');
    expect(f.job.recipe).toBe('mill_flour_separate_x3');
    expect(f.job.total).toBe(420);
    expect(f.job.held.grain).toBe(18);
    expect(recipeOf(f.job).outputs).toEqual({ flour: 15 });
    expect(recipeOf(f.job).waste).toEqual({ grain: 3 });
    // (the separate mill is a recovered-workshop kind: its work is gated by recovered_workshops.ts, which these staged shelves do not satisfy)
    expect(begun({ grain: 12 }, 'mill_flour_separate', 249, 'mill').job.recipe).toBe('mill_flour_separate_x2');
  });

  it('a firing takes 3, 6 or 9 flour with 2, 3 or 4 water and one wood to 4, 8 or 12 loaves', () => {
    expect(begun({ flour: 3, water: 2, wood: 1 }, 'bake_bread').job.recipe).toBe('bake_bread');
    expect(begun({ flour: 6, water: 3, wood: 1 }, 'bake_bread').job.recipe).toBe('bake_bread_x2');
    // enough flour for nine but water for only two measures: the largest that every input covers
    expect(begun({ flour: 9, water: 3, wood: 1 }, 'bake_bread').job.recipe).toBe('bake_bread_x2');
    const big = begun({ flour: 9, water: 4, wood: 1 }, 'bake_bread');
    expect(big.job.recipe).toBe('bake_bread_x3');
    work(big.w, big.b, big.p);
    expect(big.b.ops!.job!.phase).toBe('burn');
    expect(big.w.ledger.reasons['-burned as fuel']).toBe(1);
    burn(big.w, big.b);
    expect(big.b.ops!.job).toBeNull();
    expect(big.b.store.items.bread).toBe(12);
    expect(conservationReport(big.w).ok).toBe(true);
  });

  it('is not a part of the planner: no larger recipe is in RECIPES, offered, or counted as making anything', () => {
    expect(RECIPES.some((r) => r.scaleOf)).toBe(false);
    expect(recipesMaking('flour').some((r) => r.scaleOf)).toBe(false);
    expect(recipesMaking('bread').some((r) => r.scaleOf)).toBe(false);
    expect(recipeOf(begun({ grain: 12 }, 'mill_flour').job).scaleOf).toBe('mill_flour');
  });

  it('needs the same procedure as the base recipe', () => {
    expect(techniqueOfRecipe('bake_bread_x3')).toBe(techniqueOfRecipe('bake_bread'));
    expect(techniqueOfRecipe('mill_flour_x2')).toBe(techniqueOfRecipe('mill_flour'));
  });

  it('the planners see a larger batch under its base recipe, and the maker may get back to it', () => {
    const f = begun({ grain: 12 }, 'mill_flour');
    expect(facilitySnapshot(f.w, f.b)!.job).toBe('mill_flour');
    expect(facilitySnapshot(f.w, f.b)!.yields.flour).toBe(9);
    expect(resumableJob(f.w, f.b, f.p, RECIPE_BY_ID.mill_flour)).toBe(true);
    expect(startJob(f.w, f.b, f.p, RECIPE_BY_ID.mill_flour, f.p.id, 'again')).toBeNull();
    expect(f.b.ops!.job!.recipe).toBe('mill_flour_x3');
  });

  it('what a person is asked to bring is a full oven: 12 grain for a milling, 9 flour 4 water 1 wood for a firing (production.ts uses this)', () => {
    const f = bakery({}, 249);
    expect(fullLoadNeed(f.w, RECIPE_BY_ID.mill_flour)).toEqual({ grain: 12 });
    expect(fullLoadNeed(f.w, RECIPE_BY_ID.bake_bread)).toEqual({ flour: 9, water: 4, wood: 1 });
    expect(fullLoadNeed(f.w, RECIPE_BY_ID.saw_planks)).toBeNull();
    expect(fullLoadNeed(bakery({}, 248).w, RECIPE_BY_ID.mill_flour)).toBeNull();
    setOvenLoad(false);
    expect(fullLoadNeed(f.w, RECIPE_BY_ID.mill_flour)).toBeNull();
  });

  it('a save in the middle of a larger batch continues identically', () => {
    const f = begun({ flour: 9, water: 4, wood: 1 }, 'bake_bread');
    for (let i = 0; i < 20; i++) stepWorld(f.w);
    const copy = deserializeWorld(serializeWorld(f.w));
    for (let i = 0; i < 200; i++) {
      stepWorld(f.w);
      stepWorld(copy);
    }
    expect(serializeWorld(copy)).toBe(serializeWorld(f.w));
  });
});

describe('rules 249 against rules 248', () => {
  it('rules 248 with the shelf full takes one measure (this fails if the rule is taken out)', () => {
    const f = begun({ grain: 12 }, 'mill_flour', 248);
    expect(f.job.recipe).toBe('mill_flour');
    expect(f.job.total).toBe(70);
    expect(f.b.store.items.grain).toBe(8);
    expect(hasOvenLoad(f.w)).toBe(false);
    expect(largerBatches(f.w, RECIPE_BY_ID.mill_flour)).toEqual([]);
  });

  it('the lab switch rich-no-oven-load restores one measure at 249 and is restored after', () => {
    const iv = parseIntervention('rich-no-oven-load');
    expect(iv.summary).toMatch(/249/);
    const undo = iv.install!();
    expect(begun({ grain: 12 }, 'mill_flour').job.recipe).toBe('mill_flour');
    undo();
    expect(begun({ grain: 12 }, 'mill_flour').job.recipe).toBe('mill_flour_x3');
  });
});
