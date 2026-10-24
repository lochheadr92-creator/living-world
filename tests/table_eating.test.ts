// Eating at a store when the pack is full (rules version 11; src/sim/tableeating.ts).
//
// Before version 11 a meal at a store was moved into the pack and eaten from there, so a person whose pack had no room (they were
// carrying wood and stone for a house site) failed with "there is no food there" at a store they could see was stocked, and
// wrote it off. These scenes are STAGED: they check the rule, and every one steps the real world. The one ordinary run at the
// end is the measured situation itself.
import { afterEach, describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { parseIntervention } from '../scripts/lab/lab';
import { createBuilding } from '../src/sim/buildings';
import { addItem, conservationReport, consume, foodUnits } from '../src/sim/economy';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { RNG, hashString } from '../src/sim/rng';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { testKit } from '../src/sim/scenes';
import { eatsAtTheStore, setTableEating, TABLE_EATING_FROM_VERSION } from '../src/sim/tableeating';
import type { Items, World } from '../src/sim/types';
import { hashWorld, stepWorld } from '../src/sim/world';
import { deepHash } from './helpers/golden';
import { watchStoreMeals } from './helpers/storewatch';

afterEach(() => setTableEating(true));

interface SceneOptions {
  version?: number;
  dynamics?: 'rich' | 'authored';
  /** what Ada carries: by default a pack with no room in it for a single berry */
  inv?: Items;
  hunger?: number;
  /** the store belongs to somebody else's household (Bea's), so a meal there is theft */
  theirs?: boolean;
  berries?: number;
}

/** Ada, hungry, beside a stocked store, with her hands full of building material. Staged. */
function scene(o: SceneOptions = {}) {
  const settings = currentWorldSettings('normal', 'table-eating', { immigration: false });
  settings.rulesVersion = o.version ?? CURRENT_RULES_VERSION;
  if (o.dynamics) settings.dynamics = o.dynamics;
  const w = testKit.flatWorld(settings);
  const rng = new RNG(hashString('table-eating'));
  const ada = testKit.addPerson(w, rng, { name: 'Ada', x: 41.5, y: 41.5, age: 28, hunger: o.hunger ?? 18, thirst: 95, energy: 95, inv: o.inv ?? { wood: 3, stone: 2 } });
  // Bea lives far from the store, so nobody sees a meal taken from it
  const bea = o.theirs ? testKit.addPerson(w, rng, { name: 'Bea', x: 70.5, y: 70.5, age: 30, hunger: 90, thirst: 95, energy: 95 }) : null;
  const owner = bea ?? ada;
  const store = createBuilding(w, 'lean_to', 44, 40, owner.hhId);
  addItem(store.store.items, 'berries', o.berries ?? 8);
  const hh = w.households.find((h) => h.id === owner.hhId);
  if (hh) hh.homeId = store.id;
  testKit.finish(w, 'natural');
  ada.immuneUntil = 1e9;
  if (bea) bea.immuneUntil = 1e9;
  return { w, ada, bea, store };
}

/** step until `done` or `limit` ticks, watching store meals as they finish */
function run(w: World, limit: number, done: () => boolean = () => false) {
  const watch = watchStoreMeals();
  watch.attach(w);
  for (let i = 0; i < limit && !done(); i++) {
    stepWorld(w);
    watch.scan(w);
  }
  return watch.meals;
}

const PACK = { wood: 3, stone: 2 };

describe('a meal at a store does not need room in the pack', () => {
  it('feeds somebody whose pack is full, from the store, without carrying anything', () => {
    const { w, ada, store } = scene();
    const hungerBefore = ada.needs.hunger;
    // until the meal has finished and written its result, which is after hunger has already risen
    const meals = run(w, 900, () => ada.needs.hunger > 60 && !ada.activity);
    expect(ada.needs.hunger, 'she ate').toBeGreaterThan(hungerBefore + 12);
    expect(meals.ok).toBeGreaterThanOrEqual(1);
    expect(meals.packFull).toBe(0);
    expect(meals.failed).toBe(0);
    expect(ada.inv, 'nothing was carried and nothing was dropped').toEqual(PACK);
    expect(foodUnits(store.store.items), 'the food came out of the store').toBeLessThan(8);
    expect(ada.failures[store.id], 'a stocked store is not written off').toBeUndefined();
  });

  it('spends the household food through the ledger: nothing created, nothing duplicated, the books balance', () => {
    const { w, ada, store } = scene();
    run(w, 900, () => ada.needs.hunger > 60);
    const eaten = w.ledger.consumed.berries ?? 0;
    expect(eaten).toBeGreaterThanOrEqual(1);
    expect(w.ledger.reasons['-eaten']).toBe(eaten);
    // what left the store is exactly what was eaten plus what spoiled in the open, and nothing else
    expect(8 - foodUnits(store.store.items)).toBe(eaten + (w.ledger.spoiled.berries ?? 0));
    expect(w.ledger.created.berries ?? 0, 'no food was made to fill the gap').toBe(0);
    expect(conservationReport(w), JSON.stringify(conservationReport(w).diffs)).toEqual({ ok: true, diffs: [] });
  });

  it('the person remembers the store as it stands after the meal', () => {
    const { w, ada, store } = scene();
    run(w, 900, () => ada.needs.hunger > 60 && !ada.activity);
    const belief = ada.beliefs[store.id];
    expect(belief?.items?.berries ?? 0).toBe(store.store.items.berries ?? 0);
  });

  it('ends a meal cleanly when the store runs out, and that is a meal, not a failure', () => {
    const { w, ada, store } = scene({ berries: 1 });
    const meals = run(w, 900, () => (w.ledger.consumed.berries ?? 0) >= 1 && !ada.activity);
    expect(foodUnits(store.store.items)).toBe(0);
    expect(w.ledger.consumed.berries).toBe(1);
    expect(meals.ok).toBe(1);
    expect(meals.failed).toBe(0);
  });
});

describe('what stays as it was', () => {
  it('a pack with room is not touched: the same meal, byte for byte, under version 8 and version 11', () => {
    const snap = (version: number) => {
      const { w } = scene({ version, inv: {} });
      run(w, 400);
      return JSON.stringify({
        people: w.persons.map((p) => ({ id: p.id, x: p.x, y: p.y, needs: p.needs, inv: p.inv, failures: p.failures })),
        stores: w.buildings.map((b) => b.store.items),
        ledger: w.ledger,
      });
    };
    expect(snap(9)).toBe(snap(8));
  });

  it.each([
    ['version 8', { version: 8 }],
    ['the lab switch off', { switchOff: true }],
    ['legacy dynamics at version 11', { dynamics: 'authored' as const }],
  ])('under %s a full pack still fails exactly as before: the store is written off while it is full of food', (_name, o: { version?: number; switchOff?: boolean; dynamics?: 'authored' }) => {
    if (o.switchOff) setTableEating(false);
    const { w, ada, store } = scene({ version: o.version, dynamics: o.dynamics });
    const meals = run(w, 900);
    expect(meals.packFull, 'the situation the rule changes').toBeGreaterThanOrEqual(1);
    expect(meals.ok).toBe(0);
    expect(ada.failures[store.id]?.reason).toBe('no food there');
    expect(w.ledger.consumed.berries ?? 0).toBe(0);
    expect(ada.inv).toEqual(PACK);
  });

  it('is eligible only from version 11, only in rich worlds, and only while the switch is on', () => {
    expect(TABLE_EATING_FROM_VERSION).toBe(11);
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(TABLE_EATING_FROM_VERSION);
    expect(eatsAtTheStore(scene({ version: 11 }).w)).toBe(true);
    expect(eatsAtTheStore(scene({ version: 8 }).w)).toBe(false);
    expect(eatsAtTheStore(scene({ version: 11, dynamics: 'authored' }).w)).toBe(false);
    setTableEating(false);
    expect(eatsAtTheStore(scene({ version: 11 }).w)).toBe(false);
  });

  it('the lab switch rich-no-table-eating turns it off and restores it', () => {
    const arm = parseIntervention('rich-no-table-eating');
    expect(arm.install).toBeTypeOf('function');
    const restore = arm.install!();
    expect(eatsAtTheStore(scene().w)).toBe(false);
    restore();
    expect(eatsAtTheStore(scene().w)).toBe(true);
  });
});

describe('a store that is not theirs', () => {
  it('is still theft: the meal is reported once, for the units actually eaten', () => {
    const { w, ada, store } = scene({ theirs: true, hunger: 8 });
    const meals = run(w, 900, () => (w.ledger.consumed.berries ?? 0) >= 1 && !ada.activity);
    const eaten = w.ledger.consumed.berries ?? 0;
    expect(eaten, 'she ate at the store').toBeGreaterThanOrEqual(1);
    expect(meals.ok).toBe(1);
    expect(ada.inv).toEqual(PACK);
    const told = ada.log.filter((l) => /Took \d+ food from the .* store/.test(l.text));
    expect(told, JSON.stringify(ada.log.map((l) => l.text))).toHaveLength(1);
    expect(Number(/Took (\d+) food/.exec(told[0].text)![1])).toBe(eaten);
    expect(store.hhId).not.toBe(ada.hhId);
  });
});

describe('when the food is gone before the first bite', () => {
  it('ends as a failure, not a success, and the store is then known to be empty', () => {
    const { w, ada, store } = scene();
    run(w, 900, () => ada.activity?.data.table === true);
    expect(ada.activity?.kind, 'she sat down to eat at the store').toBe('eat_store');
    // somebody else takes everything in the few ticks before she swallows
    consume(w, store.store.items, 'berries', foodUnits(store.store.items), 'test: taken by someone else');
    const meals = run(w, 400, () => !ada.activity);
    expect(ada.lastResult?.outcome).toBe('failed');
    expect(ada.lastResult?.detail).toMatch(/somebody else/);
    expect(meals.ok).toBe(0);
    expect(ada.failures[store.id]?.reason, 'now it really is empty').toBe('no food there');
    expect(conservationReport(w).ok).toBe(true);
  });
});

describe('saves, replay and observation', () => {
  it('a world saved in the middle of a meal at a store continues identically', () => {
    const { w, ada } = scene();
    run(w, 900, () => ada.activity?.data.table === true);
    expect(ada.activity?.data.table).toBe(true);
    const back = deserializeWorld(serializeWorld(w));
    expect(back.settings.rulesVersion).toBe(CURRENT_RULES_VERSION);
    expect(hashWorld(back)).toBe(hashWorld(w));
    for (let i = 0; i < 300; i++) {
      stepWorld(w);
      stepWorld(back);
    }
    expect(hashWorld(back)).toBe(hashWorld(w));
    expect(deepHash(back)).toBe(deepHash(w));
    expect(back.ledger.consumed).toEqual(w.ledger.consumed);
  });

  it('is deterministic: the same scene twice gives the same world', () => {
    const a = scene().w;
    const b = scene().w;
    run(a, 500);
    run(b, 500);
    expect(hashWorld(a)).toBe(hashWorld(b));
    expect(deepHash(a)).toBe(deepHash(b));
  });

  it('watching the meals changes nothing: the watched world is the unwatched world', () => {
    const watched = scene().w;
    const plain = scene().w;
    run(watched, 500);
    for (let i = 0; i < 500; i++) stepWorld(plain);
    expect(hashWorld(watched)).toBe(hashWorld(plain));
    expect(deepHash(watched)).toBe(deepHash(plain));
  });
});

describe('an ordinary world, not a staged one', () => {
  // The measured situation. Version 8 leaves people at stocked stores unable to eat because of what they carry; version 11 does not.
  // Seed `river`, Normal, arrivals off, 12,000 ticks (5 days) from the start.
  const ordinary = (version: number) => {
    const w = createWorld({ ...currentWorldSettings('normal', 'river', { immigration: false }), rulesVersion: version });
    const meals = run(w, 12000);
    return { w, meals };
  };

  it('version 8 fails at full stores; version 11 never fails for want of room, and its books balance', () => {
    const v8 = ordinary(8);
    const v9 = ordinary(11);
    expect(v8.meals.packFull, 'the defect, as measured on the version-8 revision').toBeGreaterThan(10);
    expect(v9.meals.packFull).toBe(0);
    expect(v9.meals.ok).toBeGreaterThan(v8.meals.ok);
    expect(conservationReport(v9.w), JSON.stringify(conservationReport(v9.w).diffs)).toEqual({ ok: true, diffs: [] });
  }, 180000);
});
