// Rules 244: farming carries the settlement, and the granary holds what it grows (src/sim/farm_scale.ts; read in
// options_work.ts optFarm, buildings.ts createBuilding and leave_heaviest.ts).
// STAGED: a flat world, a household of the size asked with seed in hand and the plots it already works. Whether it breaks
// ground for another is the engine's own answer.
import { afterEach, describe, expect, it } from 'vitest';
import { parseIntervention } from '../scripts/lab/lab';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { createBuilding } from '../src/sim/buildings';
import { BUILD_DEF } from '../src/sim/constants';
import { generateOptions } from '../src/sim/decision';
import { conservationReport } from '../src/sim/economy';
import { FARM_SCALE_PARTS, GRANARY_HOLDS, plotsWanted, setFarmScale, storeCapOf } from '../src/sim/farm_scale';
import { createPlot } from '../src/sim/farming';
import { observe } from '../src/sim/knowledge';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import type { Building, Person, World } from '../src/sim/types';
import { addPerson, building, done, stage } from './helpers/kit';

afterEach(() => setFarmScale(true));

/** A fed household of `members` grown people at their hut, the first holding seed, working `plots` growing plots (staged). */
function fixture(version: number, members: number, plots: number) {
  const s = stage('farm-scale'), w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = version;
  w.tick = 1000;
  const p = addPerson(s, 'Hana', 40.5, 40.5, { age: 32, hunger: 100, thirst: 100, energy: 100, traits: { diligence: 0.8 }, inv: { seeds: 4, bread: 4, fish: 6, fruit: 8 } }); // well fed: a short household wants one plot more under either rule
  for (let i = 1; i < members; i++) addPerson(s, 'Kin' + i, 41.5 + i, 40.5, { age: 30, hh: p.hhId, hunger: 100, thirst: 100, energy: 100, inv: { bread: 4 } });
  const home = building(s, 'hut', 36, 36, p.hhId, { bread: 20 });
  w.households.find((h) => h.id === p.hhId)!.homeId = home.id;
  const made = [];
  for (let i = 0; i < plots; i++) { const pl = createPlot(w, 44 + i * 3, 46, p.hhId); pl.state = 'growing'; made.push(pl); }
  done(s);
  observe(w, p, home);
  for (const pl of made) observe(w, p, pl);
  return { s, w, p, home };
}
const breaksGround = (w: World, p: Person): boolean => generateOptions(w, p, true, true).options.some((o) => /new plot/i.test(o.label));

describe('rules 244: farming carries the settlement, and the granary holds what it grows', () => {
  it('is a supported version, and its removal and each part are lab arms', () => {
    expect(SUPPORTED_RULES_VERSIONS).toContain(244);
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(244);
    for (const arm of ['rich-no-farm-scale', ...FARM_SCALE_PARTS.map((k) => 'rich-no-farm-scale-' + k)]) expect(parseIntervention(arm).spec).toBe(arm);
  });

  it('a household wants a plot and one a head, where it wanted one and one for every two', () => {
    const now = fixture(244, 1, 0).w, before = fixture(243, 1, 0).w;
    expect([1, 2, 3, 4, 6].map((m) => plotsWanted(now, m, false))).toEqual([2, 3, 4, 5, 7]);
    expect([1, 2, 3, 4, 6].map((m) => plotsWanted(before, m, false))).toEqual([1, 2, 2, 3, 4]);
    expect(plotsWanted(now, 2, true), 'and one more when short of food, as before').toBe(4);
    expect(plotsWanted(before, 2, true)).toBe(3);
  });

  it('two people working two plots break ground for a third; before, two were enough', () => {
    const now = fixture(244, 2, 2);
    expect(breaksGround(now.w, now.p)).toBe(true);
    const before = fixture(243, 2, 2);
    expect(breaksGround(before.w, before.p)).toBe(false);
    const full = fixture(244, 2, 3);
    expect(breaksGround(full.w, full.p), 'three is what two people want').toBe(false);
  });

  it('a granary raised now holds 480, and before held 120; no other store changes', () => {
    const now = fixture(244, 1, 0), before = fixture(243, 1, 0);
    const g = createBuilding(now.w, 'granary', 50, 30, 0), old = createBuilding(before.w, 'granary', 50, 30, 0);
    expect(g.store.cap).toBe(GRANARY_HOLDS);
    expect(GRANARY_HOLDS).toBe(480);
    expect(old.store.cap).toBe(BUILD_DEF.granary.cap);
    expect(BUILD_DEF.granary.cap).toBe(120);
    for (const type of ['storehouse', 'cellar', 'hut', 'bakery'] as const) expect(storeCapOf(now.w, type)).toBe(BUILD_DEF[type].cap);
    expect(createBuilding(now.w, 'storehouse', 56, 30, 0).store.cap).toBe(BUILD_DEF.storehouse.cap);
  });

  it('the larger granary is saved and read back as it stands', () => {
    const { w } = fixture(244, 1, 0);
    const g = createBuilding(w, 'granary', 50, 30, 0);
    const copy = deserializeWorld(serializeWorld(w));
    expect((copy.byId.get(g.id) as Building).store.cap).toBe(GRANARY_HOLDS);
    expect(conservationReport(copy).ok).toBe(true);
  });

  it('each part can be removed', () => {
    const { w } = fixture(244, 2, 2);
    setFarmScale(false, 'fields');
    expect(plotsWanted(w, 2, false)).toBe(2);
    expect(storeCapOf(w, 'granary')).toBe(GRANARY_HOLDS);
    setFarmScale(true);
    setFarmScale(false, 'bins');
    expect(plotsWanted(w, 2, false)).toBe(3);
    expect(storeCapOf(w, 'granary')).toBe(120);
  });
});
