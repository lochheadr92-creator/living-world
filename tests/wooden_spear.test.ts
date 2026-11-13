// Rules 240: a wooden spear, and everybody grown wants one (src/sim/wooden_spear.ts; read wherever a hand tool's recipe is
// read, and in options_work.ts wantedTool).
// STAGED: a flat world, Ada with wood in her pack at a workspace, no wolf anywhere. Everything after the staging is the
// engine's: the want, the option, the craft.
import { afterEach, describe, expect, it } from 'vitest';
import { parseIntervention } from '../scripts/lab/lab';
import { startActivity, stepActivity } from '../src/sim/activities';
import { createBuilding } from '../src/sim/buildings';
import { TOOL_RECIPE } from '../src/sim/constants';
import { generateOptions } from '../src/sim/decision';
import { conservationReport, produce } from '../src/sim/economy';
import { updateEnvironment } from '../src/sim/environment';
import { observe } from '../src/sim/knowledge';
import { wantedTool } from '../src/sim/options_work';
import { perceive } from '../src/sim/perception';
import { RNG } from '../src/sim/rng';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { testKit } from '../src/sim/scenes';
import { toolOf } from '../src/sim/tools';
import { BASKET_WANT_FLOOR } from '../src/sim/carry_more';
import { SPEAR_READY, SPEAR_WORTH, STAKE_WORK, WOODEN_SPEAR_PARTS, setWoodenSpear, spearWorth, toolRecipe } from '../src/sim/wooden_spear';
import type { World } from '../src/sim/types';
import { give } from './helpers/kit';
import { settingsFor } from './helpers/util';

afterEach(() => setWoodenSpear(true));

/** Ada, grown, fed and rested, beside her hut at midday, already holding a basket and an axe so that no other tool is wanted
 * first; wood (and stone, if asked) in her pack. No wolf has ever been seen (staged). */
function scene(version: number, o: { wood?: number; stone?: number; child?: boolean } = {}) {
  const w: World = testKit.flatWorld(settingsFor('wooden-spear', { scene: 'natural', dynamics: 'rich', rulesVersion: version }));
  const rng = new RNG(71);
  const ada = testKit.addPerson(w, rng, { name: 'Ada', x: 31.5, y: 33.5, age: o.child ? 8 : 30, hunger: 92, thirst: 92, energy: 92 });
  const home = createBuilding(w, 'hut', 30, 30, ada.hhId);
  const hh = w.households.find((h) => h.id === ada.hhId);
  if (hh) hh.homeId = home.id;
  give(w, ada, 'basket');
  give(w, ada, 'axe');
  testKit.finish(w, 'natural');
  w.tick = 1000;
  updateEnvironment(w);
  if (o.wood) produce(w, ada.inv, 99, 'wood', o.wood, 'test: given to Ada');
  if (o.stone) produce(w, ada.inv, 99, 'stone', o.stone, 'test: given to Ada');
  observe(w, ada, home);
  perceive(w, ada);
  return { w, ada, home };
}
const ctxOf = (w: World, p: World['persons'][number]) => generateOptions(w, p, true);
const craftSpear = (w: World, p: World['persons'][number]) => ctxOf(w, p).options.find((o) => o.kind === 'craft' && /spear/.test(o.label)) ?? null;

describe('rules 240: a wooden spear, and everybody grown wants one', () => {
  it('is a supported version, and its removal and each part are lab arms', () => {
    expect(SUPPORTED_RULES_VERSIONS).toContain(240);
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(240);
    for (const arm of ['rich-no-wooden-spear', ...WOODEN_SPEAR_PARTS.map((k) => 'rich-no-wooden-spear-' + k)]) expect(parseIntervention(arm).spec).toBe(arm);
  });

  it('a spear is two wood and no stone from 240, and what it was before; no other tool changes', () => {
    const now = scene(240), before = scene(239);
    expect(toolRecipe(now.w, 'spear')).toMatchObject({ wood: 2, stone: 0, work: STAKE_WORK });
    expect(toolRecipe(before.w, 'spear')).toEqual(TOOL_RECIPE.spear);
    expect(TOOL_RECIPE.spear.stone).toBe(1);
    for (const kind of ['axe', 'pick', 'hoe', 'basket', 'hammer'] as const) expect(toolRecipe(now.w, kind)).toEqual(TOOL_RECIPE[kind]);
  });

  it('a grown person who has met no wolf wants a spear from 240, and did not before', () => {
    const now = scene(240), before = scene(239);
    expect(wantedTool(ctxOf(now.w, now.ada))).toBe('spear');
    expect(wantedTool(ctxOf(before.w, before.ada))).not.toBe('spear');
    expect(SPEAR_READY, 'below the 2.2 a spear is wanted at once a wolf has been met').toBeLessThan(2.2);
    expect(SPEAR_READY, 'and below the basket, which still comes first').toBeLessThan(BASKET_WANT_FLOOR);
    expect(spearWorth(now.w, 'spear')).toBe(SPEAR_WORTH);
    expect(spearWorth(now.w, 'axe')).toBe(0);
    expect(spearWorth(before.w, 'spear')).toBe(0);
  });

  it('a child wants none, and somebody who has one wants no second', () => {
    const child = scene(240, { child: true });
    expect(wantedTool(ctxOf(child.w, child.ada))).toBeNull();
    const armed = scene(240);
    give(armed.w, armed.ada, 'spear');
    expect(wantedTool(ctxOf(armed.w, armed.ada))).not.toBe('spear');
  });

  it('with two wood and no stone the craft is offered and really makes a spear; before 240 it was not offered', () => {
    const { w, ada } = scene(240, { wood: 2 });
    const opt = craftSpear(w, ada);
    expect(opt, 'offered with wood alone').toBeTruthy();
    startActivity(w, ada, opt!.make!()!);
    for (let n = 0; n < 400 && ada.activity; n++) stepActivity(w, ada);
    expect(ada.inv.spear ?? 0).toBe(1);
    expect(ada.inv.wood ?? 0, 'both pieces of wood went into it').toBe(0);
    expect(toolOf(w, ada, 'spear'), 'an owned, worn-tracked tool').toBeTruthy();
    expect(conservationReport(w).ok).toBe(true);
    const before = scene(239, { wood: 2 });
    expect(craftSpear(before.w, before.ada), 'two wood is not a spear at rules 239').toBeNull();
  });

  it('stone in the pack is left alone by the wooden spear', () => {
    const { w, ada } = scene(240, { wood: 2, stone: 1 });
    startActivity(w, ada, craftSpear(w, ada)!.make!()!);
    for (let n = 0; n < 400 && ada.activity; n++) stepActivity(w, ada);
    expect(ada.inv.spear ?? 0).toBe(1);
    expect(ada.inv.stone ?? 0).toBe(1);
  });

  it('each part can be removed: the stone comes back, or the want goes', () => {
    setWoodenSpear(false, 'wood');
    const stone = scene(240, { wood: 2 });
    expect(toolRecipe(stone.w, 'spear')).toEqual(TOOL_RECIPE.spear);
    expect(wantedTool(ctxOf(stone.w, stone.ada)), 'still wanted').toBe('spear');
    expect(craftSpear(stone.w, stone.ada), 'but not to be had for wood alone').toBeNull();
    setWoodenSpear(true);
    setWoodenSpear(false, 'ready');
    const unwanted = scene(240, { wood: 2 });
    expect(wantedTool(ctxOf(unwanted.w, unwanted.ada))).not.toBe('spear');
    expect(toolRecipe(unwanted.w, 'spear').stone).toBe(0);
    setWoodenSpear(true);
    setWoodenSpear(false, 'worth');
    expect(spearWorth(unwanted.w, 'spear')).toBe(0);
  });
});
