// STAGED contracts for the winter reserve (rules 46): season target and window, putting by what keeps, eating from the granary.
import { afterEach, expect, it } from 'vitest';
import { addPerson, building, done, stage } from './helpers/kit';
import { makeSource } from '../src/sim/sources';
import { observe } from '../src/sim/knowledge';
import { perceive } from '../src/sim/perception';
import { generateOptions } from '../src/sim/decision';
import { reviewIntentions } from '../src/sim/intent';
import { startActivity } from '../src/sim/activities';
import { stepWorld, hashWorld } from '../src/sim/world';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { conservationReport, addItem } from '../src/sim/economy';
import { makeCtx } from '../src/sim/optutil';
import { preparationWanted, inPreWinter, setWinterReserve, hasWinterReserve, knownGranary, reserveHeld, SEASON_CAP, PREPARE_DAYS, PREPARE_DAYS_WINTER_RESERVE } from '../src/sim/provision';
import { DAY, DAYS_PER_YEAR } from '../src/sim/constants';
import { WINTER_LENGTH } from '../src/sim/hardship';
import { parseIntervention } from '../scripts/lab/lab';
import type { World } from '../src/sim/types';

afterEach(() => setWinterReserve(true));

const winterAt = DAY * (DAYS_PER_YEAR - WINTER_LENGTH);

/** a household of three in a hut with some food in the store, placed at `daysBefore` days before winter */
function household(version: number, daysBefore: number, storeFood: number) {
  const s = stage(`winter-reserve-${version}-${daysBefore}-${storeFood}`);
  const w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = version;
  const ana = addPerson(s, 'Ana', 40.5, 40.5, { age: 34, hunger: 90, thirst: 100, energy: 100 });
  addPerson(s, 'Kit', 41.5, 40.5, { age: 7, hh: ana.hhId, hunger: 90, thirst: 100, energy: 100 });
  addPerson(s, 'Lea', 42.5, 40.5, { age: 5, hh: ana.hhId, hunger: 90, thirst: 100, energy: 100 });
  const hut = building(s, 'hut', 44, 38, ana.hhId, { grain: storeFood });
  w.households.find((h) => h.id === ana.hhId)!.homeId = hut.id;
  done(s);
  w.tick = winterAt - Math.round(daysBefore * DAY);
  observe(w, ana, hut);
  perceive(w, ana);
  return { w, ana, hut };
}

it('rules 46 season target is two days of eating bounded by the room, with a day more notice; rules 45 keeps the one-day cushion and two days', () => {
  // 1.5 days before winter: inside both windows
  const old = household(45, 1.5, 6);
  const w45 = preparationWanted(makeCtx(old.w, old.ana, true));
  expect(w45?.cue).toBe('season');
  expect(w45?.target).toBe(12);
  const cur = household(46, 1.5, 6);
  const w46 = preparationWanted(makeCtx(cur.w, cur.ana, true));
  expect(w46?.cue).toBe('season');
  expect(w46?.target).toBe(SEASON_CAP);
  expect(w46?.short).toBe(SEASON_CAP - 6);
  // 2.5 days before winter: only the 46 window is open
  expect(PREPARE_DAYS).toBe(2);
  expect(PREPARE_DAYS_WINTER_RESERVE).toBe(3);
  const early45 = household(45, 2.5, 6);
  expect(inPreWinter(early45.w)).toBe(false);
  expect(preparationWanted(makeCtx(early45.w, early45.ana, true))).toBeNull();
  const early46 = household(46, 2.5, 6);
  expect(inPreWinter(early46.w)).toBe(true);
  expect(preparationWanted(makeCtx(early46.w, early46.ana, true))?.cue).toBe('season');
  // the hardship cue and its one-day target are untouched at 46
  const short = household(46, 1.5, 0);
  const h = preparationWanted(makeCtx(short.w, short.ana, true));
  expect(h?.cue).toBe('hardship');
  expect(h?.target).toBe(12);
  // a store already at the cushion but under the season target: at 45 nothing to do, at 46 a season plan
  const full45 = household(45, 1.5, 12);
  expect(preparationWanted(makeCtx(full45.w, full45.ana, true))).toBeNull();
  const full46 = household(46, 1.5, 12);
  expect(preparationWanted(makeCtx(full46.w, full46.ana, true))?.short).toBe(SEASON_CAP - 12);
});

it('a season plan at 46 gathers grain when a wild grain source is known, and any food when none is; rules 45 gathers anything', () => {
  for (const version of [45, 46] as const) {
    const f = household(version, 1.5, 6);
    const grain = makeSource(f.w, 'wild_grain', 48, 44, 5);
    const bush = makeSource(f.w, 'berry_bush', 46, 42, 6);
    observe(f.w, f.ana, grain);
    observe(f.w, f.ana, bush);
    perceive(f.w, f.ana);
    f.ana.cooldowns.pause = 0;
    reviewIntentions(generateOptions(f.w, f.ana, true)); // the plan is taken up where a decision takes it up (decision.ts decide)
    const ctx = generateOptions(f.w, f.ana, true);
    const plan = f.ana.intentions.find((i) => i.status === 'active' && i.kind === 'stock');
    expect(plan?.cue, `rules ${version}`).toBe('season');
    const labels = ctx.options.filter((o) => o.kind === 'gather').map((o) => o.label);
    if (version === 46) {
      expect(labels).toContain('Gathering wild grain');
      expect(labels).not.toContain('Picking berries');
    } else {
      expect(labels).toContain('Picking berries');
    }
  }
  const none = household(46, 1.5, 6);
  const bush = makeSource(none.w, 'berry_bush', 46, 42, 6);
  observe(none.w, none.ana, bush);
  perceive(none.w, none.ana);
  none.ana.cooldowns.pause = 0;
  reviewIntentions(generateOptions(none.w, none.ana, true));
  const ctx = generateOptions(none.w, none.ana, true);
  expect(none.ana.intentions.find((i) => i.status === 'active' && i.kind === 'stock')?.cue).toBe('season');
  expect(ctx.options.filter((o) => o.kind === 'gather').map((o) => o.label)).toContain('Picking berries');
});

function granaryScene(version: number, o: { share: number; hunger: number; bins?: number }) {
  const s = stage(`granary-eat-${version}-${o.share}-${o.hunger}`);
  const w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = version;
  const ana = addPerson(s, 'Ana', 40.5, 40.5, { age: 34, hunger: o.hunger, thirst: 100, energy: 100 });
  const g = building(s, 'granary', 44, 38, 0, { grain: o.bins ?? 6 });
  g.ops!.shares[ana.hhId] = { grain: o.share };
  g.ops!.tended = w.tick;
  done(s);
  observe(w, ana, g);
  perceive(w, ana);
  return { w, ana, g };
}

it('rules 46: a household eats from the granary within its own share; rules 45 cannot eat there at all', () => {
  const old = granaryScene(45, { share: 4, hunger: 40 });
  expect(generateOptions(old.w, old.ana, true, true).options.find((x) => x.kind === 'eat_store')).toBeUndefined();
  const f = granaryScene(46, { share: 4, hunger: 40 });
  const o = generateOptions(f.w, f.ana, true, true).options.find((x) => x.kind === 'eat_store');
  expect(o?.label).toBe('Eat from the granary');
  f.ana.cooldowns.pause = 0;
  startActivity(f.w, f.ana, o!.make!()!);
  for (let i = 0; i < 400 && f.ana.activity; i++) stepWorld(f.w);
  const taken = 6 - (f.g.store.items.grain ?? 0);
  expect(taken).toBeGreaterThanOrEqual(1);
  expect(taken).toBeLessThanOrEqual(4); // never beyond the share
  expect(f.g.ops!.shares[f.ana.hhId].grain).toBe(4 - taken); // booked against the share
  expect(f.ana.needs.hunger).toBeGreaterThan(40);
  expect(conservationReport(f.w).ok).toBe(true);
});

it('rules 46: no share and not starving means nothing to eat there; starving, the emergency ration applies and is booked', () => {
  const none = granaryScene(46, { share: 0, hunger: 40 });
  expect(generateOptions(none.w, none.ana, true, true).options.find((x) => x.kind === 'eat_store')).toBeUndefined();
  const starving = granaryScene(46, { share: 0, hunger: 20 });
  const o = generateOptions(starving.w, starving.ana, true, true).options.find((x) => x.kind === 'eat_store');
  expect(o?.label).toBe('Eat from the granary');
  starving.ana.cooldowns.pause = 0;
  startActivity(starving.w, starving.ana, o!.make!()!);
  for (let i = 0; i < 400 && starving.ana.activity; i++) stepWorld(starving.w);
  const taken = 6 - (starving.g.store.items.grain ?? 0);
  expect(taken).toBeGreaterThanOrEqual(1);
  expect(taken).toBeLessThanOrEqual(3);
  expect(conservationReport(starving.w).ok).toBe(true);
});

it('rules 46: the switch removes the slice reversibly, the state saves and replays, and observing changes nothing', () => {
  const f = granaryScene(46, { share: 4, hunger: 40 });
  const before = serializeWorld(f.w);
  generateOptions(f.w, f.ana, true, true);
  preparationWanted(makeCtx(f.w, f.ana, true, true));
  expect(serializeWorld(f.w)).toBe(before);
  const restore = parseIntervention('rich-no-winter-reserve').install!();
  expect(hasWinterReserve(f.w)).toBe(false);
  expect(generateOptions(f.w, f.ana, true, true).options.find((x) => x.kind === 'eat_store')).toBeUndefined();
  restore();
  expect(hasWinterReserve(f.w)).toBe(true);
  const copy: World = deserializeWorld(serializeWorld(f.w));
  f.ana.cooldowns.pause = 0;
  copy.persons.find((p) => p.id === f.ana.id)!.cooldowns.pause = 0;
  for (let i = 0; i < 600; i++) {
    stepWorld(f.w);
    stepWorld(copy);
  }
  expect(hashWorld(copy)).toBe(hashWorld(f.w));
  expect(serializeWorld(copy)).toBe(serializeWorld(f.w));
  void addItem;
});

it('rules 46: a season plan takes its grain to a known granary, the deposit is credited and the share counts toward the target', () => {
  const s = stage('winter-granary-plan');
  const w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = 46;
  const ana = addPerson(s, 'Ana', 40.5, 40.5, { age: 34, inv: { grain: 5 }, hunger: 90, thirst: 100, energy: 100 });
  addPerson(s, 'Kit', 41.5, 40.5, { age: 7, hh: ana.hhId, hunger: 90, thirst: 100, energy: 100 });
  const hut = building(s, 'hut', 44, 38, ana.hhId, { grain: 6 });
  w.households.find((h) => h.id === ana.hhId)!.homeId = hut.id;
  const g = building(s, 'granary', 50, 44, 0, {});
  g.ops!.tended = w.tick;
  done(s);
  w.tick = winterAt - Math.round(1.5 * DAY);
  observe(w, ana, hut);
  observe(w, ana, g);
  perceive(w, ana);
  ana.cooldowns.pause = 0;
  reviewIntentions(generateOptions(w, ana, true));
  const plan = ana.intentions.find((i) => i.status === 'active' && i.kind === 'stock')!;
  expect(plan.cue).toBe('season');
  expect(plan.reserve).toBe(16); // two days for two, not bounded by the hut's room because a granary is known
  expect(plan.stepKey).toBe(`bring:${g.id}:grain`);
  const ctx = generateOptions(w, ana, true, true);
  const o = ctx.options.find((x) => x.key === `bring:${g.id}:grain`);
  expect(o?.label).toBe('Bring 3 grain to the granary');
  startActivity(w, ana, o!.make!()!);
  for (let i = 0; i < 600 && ana.activity; i++) stepWorld(w);
  expect(g.store.items.grain).toBe(3);
  expect(g.ops!.shares[ana.hhId].grain).toBe(3);
  expect(plan.worked).toBe(3);
  expect(reserveHeld(w, ana, ana.beliefs[hut.id])).toBe(9);
  expect(conservationReport(w).ok).toBe(true);
  // below 46 the same person takes nothing to the granary for a reserve and the target is bounded by the hut
  const old = stage('winter-granary-plan-45');
  old.w.settings.dynamics = 'rich';
  old.w.settings.rulesVersion = 45;
  const bo = addPerson(old, 'Bo', 40.5, 40.5, { age: 34, inv: { grain: 5 }, hunger: 90, thirst: 100, energy: 100 });
  const hut2 = building(old, 'hut', 44, 38, bo.hhId, { grain: 6 });
  old.w.households.find((h) => h.id === bo.hhId)!.homeId = hut2.id;
  const g2 = building(old, 'granary', 50, 44, 0, {});
  done(old);
  old.w.tick = winterAt - Math.round(1.5 * DAY);
  observe(old.w, bo, hut2);
  observe(old.w, bo, g2);
  perceive(old.w, bo);
  bo.cooldowns.pause = 0;
  reviewIntentions(generateOptions(old.w, bo, true));
  const plan2 = old.w.persons.find((q) => q.id === bo.id)!.intentions.find((i) => i.status === 'active' && i.kind === 'stock');
  expect(plan2?.stepKey ?? '').not.toContain('bring:');
  expect(knownGranary(old.w, bo)).toBeNull();
});
