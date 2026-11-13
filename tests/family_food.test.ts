// Rules 237: the food a household has put by counts wherever it keeps it (src/sim/family_food.ts; read in lifecycle.ts
// householdFoodPerHead, which conceptionTick asks before a couple may conceive).
// STAGED: a flat world, a couple with a hut and a cellar. The ordinary-world evidence is scripts/family_probe.ts and
// docs/GROWTH_PLAN.md step G.
import { afterEach, describe, expect, it } from 'vitest';
import { parseIntervention } from '../scripts/lab/lab';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { conservationReport } from '../src/sim/economy';
import { foodInOtherStores, setFamilyFood } from '../src/sim/family_food';
import { conceptionTick, householdFoodPerHead } from '../src/sim/lifecycle';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import type { Items } from '../src/sim/types';
import { addPerson, building, done, stage } from './helpers/kit';

afterEach(() => setFamilyFood(true));

/** A couple of one household, their hut, and their cellar beside it (staged); another household's cellar and a shared store stand by. */
function fixture(version: number, o: { home?: Items; cellar?: Items; others?: Items; shared?: Items } = {}) {
  const s = stage('family-food'), w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = version;
  w.tick = 1000;
  const her = addPerson(s, 'Hana', 40.5, 60.5, { sex: 'f', age: 28, hunger: 100, thirst: 100, energy: 100 });
  const him = addPerson(s, 'Tomas', 41.5, 60.5, { sex: 'm', age: 30, hh: her.hhId, hunger: 100, thirst: 100, energy: 100 });
  her.partnerId = him.id;
  him.partnerId = her.id;
  const other = addPerson(s, 'Brannoc', 60.5, 60.5, { sex: 'm', age: 40, hunger: 100, thirst: 100, energy: 100 });
  const home = building(s, 'hut', 38, 58, her.hhId, o.home ?? {});
  w.households.find((h) => h.id === her.hhId)!.homeId = home.id;
  const cellar = building(s, 'cellar', 42, 58, her.hhId, o.cellar ?? {});
  const theirs = building(s, 'cellar', 62, 58, other.hhId, o.others ?? {});
  const shared = building(s, 'storehouse', 50, 66, 0, o.shared ?? {});
  done(s);
  return { s, w, her, him, other, home, cellar, theirs, shared };
}
/** The world's own check, called as many times as six years of it (staged: nothing else moves). */
function checks(w: ReturnType<typeof fixture>['w'], n = 900): void {
  for (let i = 0; i < n; i++) conceptionTick(w);
}

describe('rules 237: the food a household has put by counts wherever it keeps it', () => {
  it('is a supported version, and its removal is a lab arm', () => {
    expect(SUPPORTED_RULES_VERSIONS).toContain(237);
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(237);
    expect(parseIntervention('rich-no-family-food').spec).toBe('rich-no-family-food');
  });

  it('counts the food in the household\'s cellar toward the food a head', () => {
    const { w, her, home, cellar } = fixture(237, { home: { grain: 2 }, cellar: { grain: 10 } });
    expect(foodInOtherStores(w, her.hhId, home.id)).toBeGreaterThan(0);
    expect(householdFoodPerHead(w, her)).toBeGreaterThanOrEqual(3);
    // the home's own store is counted once, not twice
    const withCellar = householdFoodPerHead(w, her);
    cellar.store.items.grain = 0;
    expect(withCellar - householdFoodPerHead(w, her)).toBeCloseTo(foodPerHeadOf(10, 2), 6);
  });

  it('counts neither another household\'s cellar nor a shared store', () => {
    const { w, her, home } = fixture(237, { home: { grain: 2 }, others: { grain: 40 }, shared: { grain: 40 } });
    expect(foodInOtherStores(w, her.hhId, home.id)).toBe(0);
    expect(householdFoodPerHead(w, her)).toBeLessThan(3);
  });

  it('leaves the measure at three a head: a cellar with too little is still too little', () => {
    const { w, her } = fixture(237, { home: { grain: 1 }, cellar: { grain: 2 } });
    expect(householdFoodPerHead(w, her)).toBeLessThan(3);
    checks(w);
    expect(her.pregnantUntil).toBe(0);
  });

  it('lets a couple whose food is in the cellar conceive, where before it could not', () => {
    const now = fixture(237, { cellar: { grain: 12 } });
    checks(now.w);
    expect(now.her.pregnantUntil).toBeGreaterThan(0);
    expect(now.her.pregnantBy).toBe(now.him.id);

    const before = fixture(236, { cellar: { grain: 12 } });
    expect(householdFoodPerHead(before.w, before.her)).toBeLessThan(3);
    checks(before.w);
    expect(before.her.pregnantUntil).toBe(0);
  });

  it('with the part removed counts the packs and the home only, as rules 236 does', () => {
    const { w, her, home } = fixture(237, { home: { grain: 2 }, cellar: { grain: 10 } });
    const earlier = fixture(236, { home: { grain: 2 }, cellar: { grain: 10 } });
    setFamilyFood(false);
    expect(foodInOtherStores(w, her.hhId, home.id)).toBe(0);
    expect(householdFoodPerHead(w, her)).toBe(householdFoodPerHead(earlier.w, earlier.her));
    checks(w);
    expect(her.pregnantUntil).toBe(0);
  });

  it('moves and saves nothing: stock is conserved and a saved world reloads the same', () => {
    const { w, her } = fixture(237, { home: { grain: 2 }, cellar: { grain: 10 } });
    const saved = serializeWorld(w);
    householdFoodPerHead(w, her);
    expect(serializeWorld(w)).toBe(saved);
    expect(serializeWorld(deserializeWorld(saved))).toBe(saved);
    expect(conservationReport(w).ok).toBe(true);
  });
});

/** how much a quantity of grain adds to the food a head of a household of a given size */
function foodPerHeadOf(grain: number, members: number): number {
  const probe = fixture(237, { cellar: { grain } });
  return foodInOtherStores(probe.w, probe.her.hhId, probe.home.id) / members;
}
