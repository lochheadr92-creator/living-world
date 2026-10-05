import { describe, expect, it } from 'vitest';
import { ALL_ITEMS, TOOLS, TOOL_DEFS, TOOL_RECIPE } from '../src/sim/constants';
import { conservationReport } from '../src/sim/economy';
import { startJob, workJob } from '../src/sim/facilities';
import { RECIPE_BY_ID } from '../src/sim/recipes';
import { isToolItem, toolReport, toolsHeldBy } from '../src/sim/toolreg';
import { wearRate } from '../src/sim/tools';
import type { Building, Person, World } from '../src/sim/types';
import { addPerson, building, done, give, stage } from './helpers/kit';

/** run one worker on the running batch until its work phase is over (or give up) */
function work(w: World, b: Building, p: Person, max = 900): void {
  for (let i = 0; i < max; i++) {
    w.tick++;
    if (workJob(w, b, p) !== 'continue') return;
  }
}

describe('a spear is a tool like the others', () => {
  it('every kind of tool is a tool item, an item, and has a recipe by hand unless it cannot be made by hand', () => {
    for (const k of TOOLS) {
      expect(isToolItem(k), k).toBe(true);
      expect(ALL_ITEMS, k).toContain(k);
      expect(TOOL_DEFS[k].label.length, k).toBeGreaterThan(0);
    }
    expect(TOOLS).toContain('spear');
    expect(TOOL_RECIPE.spear).toMatchObject({ wood: 2, stone: 1 });
  });

  it('a spear wears only as it is used, and an iron-headed one wears half as fast', () => {
    const s = stage('spear-wear');
    const a = addPerson(s, 'Ann', 44, 44);
    const old = give(s.w, a, 'spear', 0);
    const iron = give(s.w, a, 'spear', 1);
    done(s);
    expect(old.wear).toBe(0);
    expect(wearRate(iron)).toBeCloseTo(wearRate(old) / 2, 9);
  });

  it('forging an iron spear takes iron, a handle and charcoal and gives a tier-1 spear, on the books', () => {
    const s = stage('forge-spear');
    const p = addPerson(s, 'Ann', 44, 44);
    give(s.w, p, 'hammer');
    const b = building(s, 'smithy', 50, 50, 0, { iron: 1, handles: 1, charcoal: 1 });
    const w = done(s);
    expect(RECIPE_BY_ID.forge_spear.toolOut).toEqual({ kind: 'spear', tier: 1 });
    expect(startJob(w, b, p, RECIPE_BY_ID.forge_spear, p.id, 'test')).toBeNull();
    work(w, b, p);
    const made = toolsHeldBy(w, b.id, 'spear');
    expect(made).toHaveLength(1);
    expect(made[0].tier).toBe(1);
    expect(w.ledger.created.spear).toBe(1);
    expect(toolReport(w).ok).toBe(true);
    expect(conservationReport(w).ok).toBe(true);
  });
});
