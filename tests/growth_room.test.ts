// Rules 225: no fixed ceiling on a settlement (src/sim/growth_room.ts, read through rules.ts rulesOf). Every situation here is
// STAGED: people are added to the register, sites are laid out by hand and arrivals are asked for directly, so these check the
// rule; they are not examples of an ordinary world. Each check has the rules-220 contrast (221 to 224 are unused numbers).
import { afterEach, describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { openSitesNear, projectLimit, siteConflict } from '../src/sim/act_build';
import { createBuilding, createSite } from '../src/sim/buildings';
import { GROWTH_ROOM_PARTS, PEOPLE_PER_PROJECT, PEOPLE_PER_WORKPLACE, hasGrowthRoom, livingPerSettlement, setGrowthRoom } from '../src/sim/growth_room';
import { immigrationTick } from '../src/sim/lifecycle';
import { ORDINARY_RULES, rulesOf } from '../src/sim/rules';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import type { World } from '../src/sim/types';
import { natural, run } from './helpers/util';

afterEach(() => setGrowthRoom(true));

const world = (seed: string, version: number, extra: Record<string, unknown> = {}): World => natural(seed, { dynamics: 'rich', rulesVersion: version, ...extra });
const living = (w: World): number => w.persons.filter((p) => p.alive).length;
/** Staged: the register is filled out to `n` living people with copies of the founders (nobody steps this world afterwards). */
function crowded(seed: string, version: number, n: number): World {
  const w = world(seed, version);
  const founders = [...w.persons];
  for (let i = 0; living(w) < n; i++) w.persons.push({ ...founders[i % founders.length], id: 500000 + i });
  return w;
}

describe('rules 225: room to grow', () => {
  it('is a supported version at or below the current one', () => {
    expect(SUPPORTED_RULES_VERSIONS).toContain(225);
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(225);
    for (const v of [221, 222, 223, 224]) expect(SUPPORTED_RULES_VERSIONS).not.toContain(v);
  });

  it('people: no number of living people stops a conception or an arrival; at rules 220 the ceilings stand', () => {
    const before = rulesOf(world('room-people', 220));
    expect(before).toMatchObject({ immigrationCap: 54, conceptionCap: 64, arrivalGroupCap: 56 });
    const after = rulesOf(world('room-people', 225));
    expect(after.immigrationCap).toBe(Infinity);
    expect(after.conceptionCap).toBe(Infinity);
    expect(after.arrivalGroupCap).toBe(Infinity);
    // what admits an arrival is not a limit of this kind and is untouched
    expect(after.arrivalSpacing).toBe(ORDINARY_RULES.arrivalSpacing);
  });

  it('people: with food and roofs for them, arrivals go on past 54 and past 64; at rules 220 they stop at 54', () => {
    const grow = (version: number): number => {
      const w = world('room-arrivals', version, { immigration: true });
      run(w, 5200);
      // staged: roofs and food for a hundred, so only the ceiling can turn a traveller away
      for (let i = 0; i < 40; i++) createBuilding(w, 'lean_to', 2 + (i % 20) * 3, 2 + Math.floor(i / 20) * 3, 0);
      w.persons.find((p) => p.alive)!.inv.berries = 4000;
      for (let round = 0; round < 60; round++) {
        const was = living(w);
        w.stats.lastArrival = -99999;
        for (let i = 0; i < 200 && living(w) === was; i++) immigrationTick(w);
        if (living(w) === was) break;
      }
      return living(w);
    };
    const at220 = grow(220);
    expect(at220).toBeGreaterThanOrEqual(54);
    expect(at220).toBeLessThanOrEqual(58); // the last group may carry it a little past the line
    expect(grow(225)).toBeGreaterThan(64);
  }, 120000);

  it('sites: a fifth ordinary site is turned away at rules 220 and laid out at rules 225', () => {
    const open = (version: number): World => {
      const w = world('room-sites', version);
      const a = w.persons[0];
      for (let i = 0; i < 4; i++) createSite(w, 'hut', 8 + i * 3, 30, 900 + i, a.id);
      return w;
    };
    const old = open(220);
    expect(openSitesNear(old)).toBe(4);
    expect(siteConflict(old, 'hut', 1)).toMatch(/too many projects/);
    const now = open(225);
    expect(rulesOf(now).maxBasicSites).toBe(Infinity);
    expect(rulesOf(now).maxOpenSites).toBe(Infinity);
    expect(siteConflict(now, 'hut', 1)).toBeNull();
  });

  it('projects: one for every 14 living people and never fewer than before', () => {
    expect(PEOPLE_PER_PROJECT).toBe(14);
    for (const [n, want] of [[28, 2], [41, 2], [42, 3], [56, 4], [70, 5], [140, 10]] as const) {
      expect(projectLimit(crowded('room-projects', 225, n)), `${n} living`).toBe(want);
    }
    expect(projectLimit(crowded('room-projects', 220, 140))).toBe(3); // the old rule: two, three from 55 people
    // a settlement that has shrunk keeps what the rule always allowed
    const few = world('room-projects', 225);
    for (const p of few.persons.slice(6)) p.alive = false;
    expect(livingPerSettlement(few)).toBe(6);
    expect(rulesOf(few).projectsBase).toBe(2);
  });

  it('workplaces: one of each kind for every 28 living people and never fewer than one', () => {
    expect(PEOPLE_PER_WORKPLACE).toBe(28);
    for (const [n, want] of [[28, 1], [55, 1], [56, 2], [84, 3], [200, 7]] as const) {
      expect(rulesOf(crowded('room-work', 225, n)).facilityAllowance, `${n} living`).toBe(want);
    }
    expect(rulesOf(crowded('room-work', 220, 200)).facilityAllowance).toBe(1);
    // the second storehouse: refused while there are 55, allowed at 56
    const at = (n: number): string | null => {
      const w = crowded('room-work', 225, n);
      createBuilding(w, 'storehouse', 10, 10, 0);
      return siteConflict(w, 'storehouse', 1, 0, 0, { x: 30, y: 30 });
    };
    expect(at(55)).toMatch(/already a storehouse/);
    expect(at(56)).toBeNull();
  });

  it('a world founded as several camps counts one camp\'s share of the living', () => {
    const w = world('room-camps', 225, { ruleSet: 'scaled', population: 100, settlementFounders: 25 });
    const n = living(w);
    expect(livingPerSettlement(w)).toBe(Math.floor((n * 25) / 100));
    expect(rulesOf(w).immigrationCap).toBe(Infinity);
  });

  it('each part has its own switch, and with all of them thrown the limits are those of rules 220', () => {
    const w = crowded('room-switch', 225, 84);
    expect(hasGrowthRoom(w)).toBe(true);
    setGrowthRoom(false, 'people');
    expect(rulesOf(w).immigrationCap).toBe(54);
    expect(rulesOf(w).maxOpenSites).toBe(Infinity);
    setGrowthRoom(false, 'sites');
    expect(rulesOf(w).maxOpenSites).toBe(4);
    expect(rulesOf(w).facilityAllowance).toBe(3);
    setGrowthRoom(false, 'workplaces');
    expect(rulesOf(w).facilityAllowance).toBe(1);
    expect(rulesOf(w).projectsBase).toBe(6);
    setGrowthRoom(false, 'projects');
    expect(hasGrowthRoom(w)).toBe(false);
    expect(rulesOf(w)).toEqual(rulesOf(crowded('room-switch', 220, 84)));
    expect(GROWTH_ROOM_PARTS).toEqual(['people', 'sites', 'projects', 'workplaces']);
  });

  it('authored worlds keep their limits, and nothing is saved', () => {
    const authored = natural('room-authored', { dynamics: 'authored', rulesVersion: 225 });
    expect(rulesOf(authored)).toMatchObject({ immigrationCap: 54, conceptionCap: 64, maxOpenSites: 4 });
    const w = world('room-save', 225);
    run(w, 50);
    const raw = serializeWorld(w);
    expect(raw).not.toMatch(/immigrationCap|Infinity/);
    expect(serializeWorld(deserializeWorld(raw))).toBe(raw);
  });
});
