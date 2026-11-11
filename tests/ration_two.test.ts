// Rules 206: the ration is two portions (src/sim/light_pack.ts rationPortions; optDepositFood in options_work.ts, the eat_store handler
// in act_resource.ts). Every situation here is STAGED: it checks a rule, it is not an example of spontaneous behaviour. The
// ordinary-world origin is the rules-205 lab (docs/CARRYING.md: the one-portion ration cost hunger time and child play, with 594 trips
// home a settlement) and the owner's suggestion of 11 November 2026. Each check has the rules-205 contrast.
import { afterEach, describe, expect, it } from 'vitest';
import { generateOptions } from '../src/sim/decision';
import { foodUnits } from '../src/sim/economy';
import { observe } from '../src/sim/knowledge';
import { FILLING_SPARE, RATION_KEEP, RATION_KEEP_206, mealLeaves, rationHeld, rationKeep, rationPortions, setFillingTrips, setRationTwo, tripWaitsForFillingPack } from '../src/sim/light_pack';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { stepWorld } from '../src/sim/world';
import { addPerson, building, done, stage } from './helpers/kit';
import type { Items, Person, World } from '../src/sim/types';

afterEach(() => { setRationTwo(true); setFillingTrips(false); });

/** Ada lives alone in a hut she has looked into from its door. `stock` is what the hut holds. */
function scene(version: number, opts: { inv?: Items; stock?: Items; hunger?: number; tag?: string } = {}) {
  const s = stage(`ration-two-${version}-${JSON.stringify(opts.inv ?? {})}-${JSON.stringify(opts.stock ?? {})}-${opts.hunger ?? 95}-${opts.tag ?? ''}`);
  s.w.settings = { ...s.w.settings, dynamics: 'rich', rulesVersion: version };
  const ada = addPerson(s, 'Ada', 40.5, 27.5, { age: 30, hunger: opts.hunger ?? 95, thirst: 95, energy: 95, inv: opts.inv ?? {} });
  const home = building(s, 'hut', 40, 24, ada.hhId, opts.stock ?? {});
  s.w.households.find((h) => h.id === ada.hhId)!.homeId = home.id;
  const w = done(s);
  w.tick = 600;
  // rules 184: the contents of a home are learned from inside or at the door, so she looks from the door and comes back
  const at = { x: ada.x, y: ada.y };
  ada.x = home.doorX + 0.5; ada.y = home.doorY + 0.5;
  observe(w, ada, home);
  ada.x = at.x; ada.y = at.y;
  return { w, ada, home };
}
const ctxOf = (w: World, p: Person) => generateOptions(w, p, true, true);
const foodHome = (w: World, p: Person, homeId: number) => ctxOf(w, p).options.find((o) => o.key === `deposit:${homeId}:food`);
const eatCarried = (w: World, p: Person) => ctxOf(w, p).options.find((o) => o.kind === 'eat');

describe('rules 206 is registered', () => {
  it('is registered and supported (the current version may be later)', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(206);
    expect(SUPPORTED_RULES_VERSIONS).toContain(206);
  });
});

describe('the rules themselves', () => {
  it('one portion at 205, two at 206, one again with the switch off; the portion held for the road is still the last', () => {
    const old = scene(205).w, now = scene(206).w;
    expect(rationPortions(old)).toBe(RATION_KEEP);
    expect(rationPortions(now)).toBe(RATION_KEEP_206);
    expect(rationKeep(old, true, 3)).toBe(1);
    expect(rationKeep(now, true, 3)).toBe(2);
    expect(rationKeep(now, false, 3)).toBe(3);
    expect(mealLeaves(old, 3)).toBe(1);
    expect(mealLeaves(now, 3)).toBe(2);
    expect(mealLeaves(now, 1)).toBe(1);
    expect(rationHeld(now, 2, 60, true, 100)).toBe(false);
    expect(rationHeld(now, 1, 60, true, 100)).toBe(true);
    setRationTwo(false);
    expect(rationPortions(now)).toBe(RATION_KEEP);
    expect(rationKeep(now, true, 3)).toBe(1);
  });

  it('the lab-only experiment is off unless the lab turns it on', () => {
    const now = scene(206).w;
    expect(tripWaitsForFillingPack(now, 1, 3, 12)).toBe(false);
    setFillingTrips(true);
    expect(tripWaitsForFillingPack(now, 1, 3, 12)).toBe(true);
    expect(tripWaitsForFillingPack(now, FILLING_SPARE, 5, 12)).toBe(false);
    expect(tripWaitsForFillingPack(now, 1, 9, 12)).toBe(false);
    expect(tripWaitsForFillingPack(scene(204).w, 1, 3, 12)).toBe(false);
  });
});

describe('what goes home', () => {
  it('three portions: two go home at 205 and one at 206; with the switch off, two again', () => {
    const old = scene(205, { inv: { berries: 3 } }), now = scene(206, { inv: { berries: 3 } });
    expect(foodHome(old.w, old.ada, old.home.id)!.make?.()?.data.items).toEqual({ berries: 2 });
    expect(foodHome(now.w, now.ada, now.home.id)!.make?.()?.data.items).toEqual({ berries: 1 });
    setRationTwo(false);
    expect(foodHome(now.w, now.ada, now.home.id)!.make?.()?.data.items).toEqual({ berries: 2 });
  });

  it('two portions: one goes home at 205; at 206 there is nothing to take', () => {
    const old = scene(205, { inv: { berries: 2 } }), now = scene(206, { inv: { berries: 2 } });
    expect(foodHome(old.w, old.ada, old.home.id), 'offered at 205').toBeTruthy();
    expect(foodHome(now.w, now.ada, now.home.id)).toBeUndefined();
  });

  it('the lab-only experiment: one spare portion in a light pack waits; three spare, or a pack three quarters full, goes', () => {
    const one = scene(206, { inv: { berries: 3 } });
    expect(foodHome(one.w, one.ada, one.home.id), 'offered by default').toBeTruthy();
    setFillingTrips(true);
    expect(foodHome(one.w, one.ada, one.home.id)).toBeUndefined();
    const three = scene(206, { inv: { berries: 5 } });
    expect(foodHome(three.w, three.ada, three.home.id)).toBeTruthy();
    // three berries and two stone weigh 9 of her 12
    const heavy = scene(206, { inv: { berries: 3, stone: 2 } });
    expect(foodHome(heavy.w, heavy.ada, heavy.home.id)).toBeTruthy();
  });
});

describe('what is eaten where', () => {
  const HUNGRY = { stock: { berries: 6 } as Items, hunger: 50 };
  it('hungry near a stocked home with two portions: she may eat one from her pack at 206; with only one it is held', () => {
    const two = scene(206, { ...HUNGRY, inv: { berries: 2 } });
    expect(eatCarried(two.w, two.ada), 'the second portion may be eaten').toBeTruthy();
    const one = scene(206, { ...HUNGRY, inv: { berries: 1 } });
    expect(eatCarried(one.w, one.ada)).toBeUndefined();
  });

  it('through to the ground: a meal at home leaves the two portions she arrived with at 206, and one at 205', () => {
    for (const [version, left] of [[206, 2], [205, 1]] as const) {
      // she has no food need the pack could meet without the store at 205 (one is held); at 206 she is sent to the store by hand
      const f = scene(version, { ...HUNGRY, inv: { berries: 2 }, tag: 'ground' });
      const o = ctxOf(f.w, f.ada).options.find((x) => x.kind === 'eat_store');
      expect(o, `the home store is offered at ${version}`).toBeTruthy();
      const a = o!.make?.();
      expect(a).toBeTruthy();
      f.ada.activity = null;
      const before = foodUnits(f.home.store.items);
      // staged: she takes the meal at home rather than the portion in her pack
      a!.minCommit = f.w.tick + 2000;
      f.ada.activity = a!;
      for (let i = 0; i < 900 && (foodUnits(f.home.store.items) === before || f.ada.activity?.kind === 'eat_store'); i++) stepWorld(f.w);
      expect(foodUnits(f.home.store.items), `at ${version}, last result ${JSON.stringify(f.ada.lastResult)}`).toBeLessThan(before);
      expect(f.ada.inv.berries ?? 0, `left in the pack at ${version}`).toBe(left);
    }
  });
});
