// STAGED contracts: a meal from a witnessed public storehouse is a benefit received (rules 49), counted once by what left the store.
import { afterEach, expect, it } from 'vitest';
import { addPerson, building, done, stage } from './helpers/kit';
import { observe } from '../src/sim/knowledge';
import { perceive } from '../src/sim/perception';
import { generateOptions } from '../src/sim/decision';
import { startActivity } from '../src/sim/activities';
import { stepWorld, hashWorld } from '../src/sim/world';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { conservationReport, foodUnits } from '../src/sim/economy';
import { civicExperience, hasCivicFoodBenefit, setCivicFoodBenefit } from '../src/sim/civic_benefit';
import { parseIntervention } from '../scripts/lab/lab';

afterEach(() => setCivicFoodBenefit(true));

/** Ben witnessed the public storehouse finished under Ada's coordination; the storehouse holds food; Ben is hungry. */
function scene(version: number, o: { food?: number; fullPack?: boolean; witnessed?: boolean } = {}) {
  const s = stage(`civic-food-${version}-${o.food ?? 6}-${o.fullPack ? 'full' : 'room'}-${o.witnessed === false ? 'nw' : 'w'}`);
  const w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = version;
  const ada = addPerson(s, 'Ada', 70.5, 70.5, { age: 34, hunger: 100, thirst: 100, energy: 100 });
  const ben = addPerson(s, 'Ben', 40.5, 40.5, { age: 30, hunger: 36, thirst: 100, energy: 100, inv: o.fullPack ? { stone: 20 } : {} });
  const store = building(s, 'storehouse', 44, 38, 0, { berries: o.food ?? 6 });
  done(s);
  const projectId = w.nextId++;
  if (o.witnessed !== false) ben.civicOutcomes = [{ projectId, organiserId: ada.id, success: true, tick: w.tick - 10, buildingId: store.id }];
  observe(w, ben, store);
  perceive(w, ben);
  const eat = () => {
    const opt = generateOptions(w, ben, true, true).options.find((x) => x.kind === 'eat_store' && x.targetId === store.id);
    if (!opt?.make) throw new Error('no public meal offered: ' + generateOptions(w, ben, true, true).blocked.filter((b) => b.kind === 'eat_store').map((b) => b.blocked).join('|'));
    ben.cooldowns.pause = 0;
    startActivity(w, ben, opt.make()!);
    for (let i = 0; i < 500 && ben.activity; i++) stepWorld(w);
  };
  return { w, ada, ben, store, eat, projectId };
}

it('rules 49: food that left the public store into a witness’s pack during a meal is one receipt, by exactly what moved; rules 48 earns nothing', () => {
  const old = scene(48);
  old.eat();
  expect(old.ben.civicOutcomes![0].benefit).toBeUndefined();
  const f = scene(49);
  expect(hasCivicFoodBenefit(f.w)).toBe(true);
  const before = foodUnits(f.store.store.items);
  f.eat();
  const moved = before - foodUnits(f.store.store.items);
  expect(moved).toBeGreaterThanOrEqual(1);
  const b = f.ben.civicOutcomes![0].benefit!;
  expect(b).toBeDefined();
  expect(b.item).toBe('berries');
  expect(b.amount).toBe(moved);
  expect(f.ben.log.some((l) => /The shared storehouse from project #\d+ helped me: I ate \d+ berries/.test(l.text))).toBe(true);
  expect(civicExperience(f.ben, f.ada.id, f.w)).toBeCloseTo(0.08, 5);
  expect(civicExperience(old.ben, old.ada.id, old.w)).toBeCloseTo(0.04, 5);
  // a second meal does not earn a second receipt
  f.ben.needs.hunger = 36;
  perceive(f.w, f.ben);
  f.eat();
  expect(f.ben.civicOutcomes![0].benefit).toBe(b);
  expect(conservationReport(f.w).ok).toBe(true);
});

it('rules 49: a meal eaten at the store with a full pack counts the bites actually eaten, when the meal ends', () => {
  const f = scene(49, { fullPack: true });
  const before = foodUnits(f.store.store.items);
  f.eat();
  const eaten = before - foodUnits(f.store.store.items);
  expect(eaten).toBeGreaterThanOrEqual(1);
  const b = f.ben.civicOutcomes![0].benefit!;
  expect(b.amount).toBe(eaten);
  expect(f.w.ledger.reasons['-eaten']).toBeGreaterThanOrEqual(eaten);
});

it('rules 49: an empty store, or a store the person never saw finished, earns nothing', () => {
  const empty = scene(49, { food: 0 });
  const opt = generateOptions(empty.w, empty.ben, true, true).options.find((x) => x.kind === 'eat_store' && x.targetId === empty.store.id);
  expect(opt).toBeUndefined();
  expect(empty.ben.civicOutcomes![0].benefit).toBeUndefined();
  const unseen = scene(49, { witnessed: false });
  unseen.eat();
  expect(unseen.ben.civicOutcomes ?? []).toHaveLength(0);
});

it('rules 49: the switch removes only the meal receipt, reversibly; saving and replaying are exact; observing changes nothing', () => {
  const restore = parseIntervention('rich-no-civic-food-benefit').install!();
  const off = scene(49);
  expect(hasCivicFoodBenefit(off.w)).toBe(false);
  off.eat();
  expect(off.ben.civicOutcomes![0].benefit).toBeUndefined();
  restore();
  const f = scene(49);
  const before = serializeWorld(f.w);
  generateOptions(f.w, f.ben, true, true);
  expect(serializeWorld(f.w)).toBe(before);
  const copy = deserializeWorld(serializeWorld(f.w));
  f.ben.cooldowns.pause = 0;
  copy.persons.find((p) => p.id === f.ben.id)!.cooldowns.pause = 0;
  for (let i = 0; i < 600; i++) {
    stepWorld(f.w);
    stepWorld(copy);
  }
  expect(hashWorld(copy)).toBe(hashWorld(f.w));
  expect(serializeWorld(copy)).toBe(serializeWorld(f.w));
});
