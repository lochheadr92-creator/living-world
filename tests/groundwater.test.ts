// Rules 236: a well reaches groundwater (src/sim/groundwater.ts; read in wells.ts, buildings.ts, world.ts and economy.ts).
// STAGED: a flat world with one lake along the north edge (the test kit's), a well beside the homes, and people who know it.
// The ordinary-world evidence is scripts/water_probe.ts and docs/GROWTH_PLAN.md.
import { afterEach, describe, expect, it } from 'vitest';
import { parseIntervention } from '../scripts/lab/lab';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { DAY } from '../src/sim/constants';
import { generateOptions } from '../src/sim/decision';
import { conservationReport, ledgerCreate, ledgerSpoil } from '../src/sim/economy';
import { GROUNDWATER_PARTS, GROUND_CAP, GROUND_START, GROUND_TILES, WELL_BY_HOMES, WELL_DRAWN_DRY, WELL_NEAR, WELL_SPACING, groundAt, setGroundwater, updateGroundwater } from '../src/sim/groundwater';
import { observe } from '../src/sim/knowledge';
import { perceive } from '../src/sim/perception';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { WELL_CAP, updateWells, wellDemand, wellSiteConflict, wellSpotKnown } from '../src/sim/wells';
import type { World } from '../src/sim/types';
import { addPerson, building, done, pin, site, stage } from './helpers/kit';

afterEach(() => setGroundwater(true));

/** A grown woman, her hut, and a shared well four tiles from it; the lake is far to the north (staged). */
function fixture(version: number, o: { well?: boolean; wellSite?: boolean; water?: number } = {}) {
  const s = stage('groundwater'), w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = version;
  w.tick = 1000;
  const p = addPerson(s, 'Hana', 40.5, 60.5, { age: 32, hunger: 100, thirst: 100, energy: 100 });
  const home = building(s, 'hut', 38, 58, p.hhId, { grain: 8 });
  w.households.find((h) => h.id === p.hhId)!.homeId = home.id;
  const well = o.well === false ? null : building(s, 'well', 44, 58, 0, o.water ? { water: o.water } : {});
  const ws = o.wellSite ? site(s, 'well', 44, 62, 0, p.id) : null;
  done(s);
  for (const e of [home, ...(well ? [well] : []), ...(ws ? [ws] : [])]) observe(w, p, e);
  perceive(w, p);
  pin(p);
  return { s, w, p, home, well, ws };
}
/** Step only the two water passes for a number of ticks, in a given rain (staged: nothing else moves). */
function passTime(w: World, ticks: number, rain: number): void {
  for (let i = 0; i < ticks; i++) { w.tick++; w.weather.rain = rain; updateGroundwater(w); updateWells(w); }
}
const lake = (w: World): number => (w.waterBodies ?? []).reduce((n, b) => n + b.amount, 0);

describe('rules 236: a well reaches groundwater', () => {
  it('is a supported version at or below the current one, with its three parts and its numbers', () => {
    expect(SUPPORTED_RULES_VERSIONS).toContain(236);
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(236);
    expect(GROUNDWATER_PARTS).toEqual(['ground', 'anywhere', 'more']);
    expect([GROUND_TILES, GROUND_CAP, GROUND_START, WELL_SPACING, WELL_NEAR, WELL_BY_HOMES, WELL_DRAWN_DRY]).toEqual([100, 240, 120, 6, 10, 16, 28]);
    for (const arm of ['rich-no-groundwater', 'rich-no-groundwater-ground', 'rich-no-groundwater-anywhere', 'rich-no-groundwater-more']) expect(parseIntervention(arm).spec).toBe(arm);
  });

  it('ground: a well far from any lake fills from the ground beneath it, and the lake is not drawn on; at rules 235 it stays empty', () => {
    const now = fixture(236), old = fixture(235);
    const before = lake(now.w);
    passTime(now.w, 50 * WELL_CAP + 60, 0);
    passTime(old.w, 50 * WELL_CAP + 60, 0);
    expect(now.well!.store.items.water).toBe(WELL_CAP); // one unit every 50 ticks, to the well's twelve
    expect(now.w.groundwater![now.well!.id].amount).toBe(GROUND_START - WELL_CAP);
    expect(lake(now.w)).toBe(before);
    expect(old.well!.store.items.water ?? 0).toBe(0); // no lake within 14 tiles: nothing to draw from
    expect(old.w.groundwater).toBeUndefined();
    expect(conservationReport(now.w).ok).toBe(true);
    setGroundwater(false, 'ground');
    const off = fixture(236);
    passTime(off.w, 700, 0);
    expect(off.well!.store.items.water ?? 0).toBe(0);
  });

  it('ground: rain refills the ground at the rate of a hundred tiles of lake, up to its cap; with no rain nothing comes in and the well runs dry', () => {
    const f = fixture(236);
    const g = groundAt(f.w, f.well!)!;
    ledgerSpoil(f.w, 'water', g.amount, 'staged: the ground emptied'); // staged changes go through the accounts, so they still balance
    g.amount = 0;
    passTime(f.w, DAY, 0);
    expect(g.amount).toBe(0);
    expect(f.well!.store.items.water ?? 0).toBe(0); // dry ground, dry well
    f.well!.store.items.water = WELL_CAP; // staged: a full well takes nothing, so the ground's own filling can be read
    ledgerCreate(f.w, 'water', WELL_CAP, 'staged: the well filled');
    passTime(f.w, DAY, 0.25);
    expect(g.amount).toBeGreaterThanOrEqual(49); // 100 tiles x 0.25 x 2 a day = 50, less the part of a unit not yet whole
    expect(g.amount).toBeLessThanOrEqual(50);
    passTime(f.w, 10 * DAY, 1);
    expect(g.amount).toBe(GROUND_CAP);
    expect(conservationReport(f.w).ok).toBe(true);
  });

  it('ground: the ground of a well that is gone is lost with it, through the accounts', () => {
    const f = fixture(236);
    passTime(f.w, 60, 0);
    expect(f.w.groundwater![f.well!.id]).toBeDefined();
    f.w.buildings.splice(f.w.buildings.indexOf(f.well!), 1); // staged: the well is taken out of the world
    passTime(f.w, 60, 0);
    expect(f.w.groundwater![f.well!.id]).toBeUndefined();
  });

  it('anywhere: a well may be laid out away from any lake, and six tiles from the next; before, only beside a lake and fourteen apart', () => {
    const now = fixture(236), old = fixture(235);
    expect(wellSiteConflict(old.w, 60, 60)).toBe('no nearby shallow water catchment');
    expect(wellSiteConflict(now.w, 60, 60)).toBeNull();
    expect(wellSpotKnown(now.w, now.p, 60, 60)).toBe(true);
    expect(wellSpotKnown(old.w, old.p, 60, 60)).toBe(false);
    // the staged well stands at (44,58), its middle at (45,59)
    expect(wellSiteConflict(now.w, 45 + WELL_SPACING - 1, 59)).toBe('another well already serves this place');
    expect(wellSiteConflict(now.w, 45 + WELL_SPACING + 1, 59)).toBeNull();
    setGroundwater(false, 'anywhere');
    expect(wellSiteConflict(now.w, 60, 60)).toBe('no nearby shallow water catchment');
    expect(wellSpotKnown(now.w, now.p, 60, 60)).toBe(false);
  });

  it('more: a well is wanted by the homes where none is known near; another where the one near was found empty; none while one is being dug', () => {
    const want = (f: ReturnType<typeof fixture>): number => wellDemand(generateOptions(f.w, f.p, true, true), f.home.x, f.home.y);
    expect(want(fixture(236, { well: false }))).toBeGreaterThanOrEqual(WELL_BY_HOMES); // none known within ten tiles of home
    const empty = fixture(236);
    expect(empty.p.beliefs[empty.well!.id].items?.water ?? 0).toBe(0);
    expect(want(empty)).toBe(WELL_DRAWN_DRY); // the well by us was empty when I last looked
    expect(want(fixture(236, { water: 5 }))).toBe(0); // it held water
    expect(want(fixture(236, { wellSite: true }))).toBe(0); // another is already being dug
    const stale = fixture(236);
    stale.w.tick += DAY + 10; // I have not looked for more than a day: not wanted on that memory
    expect(want(stale)).toBe(0);
    expect(want(fixture(235))).toBe(0); // before: a well within fourteen tiles ends the want
    setGroundwater(false, 'more');
    expect(want(empty)).toBe(0);
  });

  it('what the ground holds is saved, loaded and checked; a world saved and loaded continues the same', () => {
    const f = fixture(236);
    f.p.cooldowns.pause = 0;
    passTime(f.w, 120, 0.5);
    const text = serializeWorld(f.w);
    expect(JSON.parse(text).world.groundwater[f.well!.id].amount).toBe(f.w.groundwater![f.well!.id].amount);
    const copy = deserializeWorld(text);
    passTime(f.w, 300, 0.5);
    passTime(copy, 300, 0.5);
    expect(serializeWorld(copy)).toBe(serializeWorld(f.w));
    const bad = JSON.parse(text);
    bad.world.groundwater[f.well!.id].amount = GROUND_CAP + 1;
    expect(() => deserializeWorld(JSON.stringify(bad))).toThrow(/Invalid groundwater/);
  });
});
