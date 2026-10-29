// STAGED contracts for keeping winter stores as a practice (rules 53, winter_practice.ts): learned through the winter's meals
// from a laid reserve, passed to a child through the same meals, opening the season cue earlier.
import { afterEach, expect, it } from 'vitest';
import { addPerson, building, done, pin, stage } from './helpers/kit';
import { observe } from '../src/sim/knowledge';
import { perceive } from '../src/sim/perception';
import { generateOptions, rankOptions } from '../src/sim/decision';
import { startActivity } from '../src/sim/activities';
import { settleIntentions } from '../src/sim/intent';
import { stepWorld, hashWorld } from '../src/sim/world';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { conservationReport } from '../src/sim/economy';
import { DAY, DAYS_PER_YEAR, TICKS_PER_YEAR } from '../src/sim/constants';
import { preparationWanted, PREPARE_DAYS_WINTER_RESERVE } from '../src/sim/provision';
import { PRACTICE_LEAD, PRACTICE_MEALS, describeWinterPractice, isWinter, noteReserveLaid, setWinterPractice, winterPracticeLead } from '../src/sim/winter_practice';
import { observeNow } from './helpers/inhabit';
import { parseIntervention } from '../scripts/lab/lab';
import type { Person } from '../src/sim/types';
import { stageOf } from '../src/sim/people';

afterEach(() => setWinterPractice(true));

/** STAGED: Ada and her child Ben in a hut with grain put by; Cora, another household, in her own hut. The calendar is the world's. */
function scene(version = 53, stock = 30, coraStock = stock) {
  const s = stage('winter-practice-53');
  const w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = version;
  const ada = addPerson(s, 'Ada', 40.5, 40.5, { age: 34, inv: { grain: 12 }, hunger: 100, thirst: 100, energy: 100, traits: { generosity: 1 } });
  const ben = addPerson(s, 'Ben', 41.5, 40.5, { age: 8, hh: ada.hhId, hunger: 100, thirst: 100, energy: 100 });
  const cora = addPerson(s, 'Cora', 50.5, 50.5, { age: 30, hunger: 100, thirst: 100, energy: 100 });
  const home = building(s, 'hut', 38, 38, ada.hhId, { grain: stock });
  const coraHome = building(s, 'hut', 52, 52, cora.hhId, { grain: coraStock });
  w.households.find((h) => h.id === ada.hhId)!.homeId = home.id;
  w.households.find((h) => h.id === cora.hhId)!.homeId = coraHome.id;
  for (const p of [ada, ben]) observe(w, p, home);
  observe(w, cora, coraHome);
  for (const p of [ada, ben, cora]) {
    p.needs.warmth = 100;
    p.needs.safety = 100;
    pin(p);
  }
  done(s);
  for (const p of [ada, ben, cora]) perceive(w, p);
  w.sceneLabel = 'STAGED: a winter eaten from a laid reserve becomes a practice';
  /** the child is fed by Ada, by the ordinary care option, until it ends */
  const feed = (child: Person) => {
    child.needs.hunger = 22;
    ada.cooldowns.pause = 0;
    child.cooldowns.pause = 0;
    child.cooldowns.fedUntil = 0;
    ada.cooldowns['talk' + child.id] = 0;
    perceive(w, ada);
    const o = rankOptions(generateOptions(w, ada, true, true)).find((x) => x.label === `Offer grain to ${child.name}` || x.label === `Care for ${child.name}`);
    if (!o?.make) throw new Error('no care: ' + generateOptions(w, ada, true, true).options.map((x) => x.label).join('|'));
    const before = child.stats.received;
    startActivity(w, ada, o.make()!);
    for (let i = 0; i < 600 && child.stats.received === before; i++) stepWorld(w);
    if (child.stats.received === before) throw new Error('the child was not fed');
    pin(ada);
    pin(child);
  };
  /** one real meal from the home store, by the ordinary option, until it ends */
  const eat = (p: Person) => {
    // a child takes a meal from the store only when plainly hungry; an adult sooner
    p.needs.hunger = stageOf(w, p) === 'child' ? 18 : 30;
    p.cooldowns.pause = 0;
    // they look in the store (a staged glance: the store may have been refilled since they last saw it)
    observe(w, p, p.hhId === ada.hhId ? home : coraHome);
    perceive(w, p);
    let o = rankOptions(generateOptions(w, p, true, true)).find((x) => x.label === 'Eat from the home store');
    // what they carry is eaten first (not a store meal, and not counted), then the store
    for (let tries = 0; !o?.make && tries < 2; tries++) {
      const carried = rankOptions(generateOptions(w, p, true, true)).find((x) => x.label === 'Eat what I am carrying');
      if (!carried?.make) break;
      startActivity(w, p, carried.make()!);
      for (let i = 0; i < 400 && p.activity?.kind === 'eat'; i++) stepWorld(w);
      p.needs.hunger = stageOf(w, p) === 'child' ? 18 : 30;
      p.cooldowns.pause = 0;
      perceive(w, p);
      o = rankOptions(generateOptions(w, p, true, true)).find((x) => x.label === 'Eat from the home store');
    }
    if (!o?.make) throw new Error('no store meal: ' + generateOptions(w, p, true, true).options.map((x) => x.label).join('|'));
    startActivity(w, p, o.make()!);
    for (let i = 0; i < 400 && p.activity?.kind === 'eat_store'; i++) stepWorld(w);
    pin(p);
  };
  return { w, ada, ben, cora, home, coraHome, eat, feed };
}
const winterStart = (year: number) => (year * DAYS_PER_YEAR + DAYS_PER_YEAR - 4) * DAY;

it('rules 53: a season reserve that reached its target marks the household\'s reserve laid for the year; below 53 nothing is marked', () => {
  for (const version of [52, 53]) {
    const f = scene(version);
    f.ada.intentions.push({ id: f.w.nextId++, kind: 'stock', goal: 'put 8 units of food by for the household', since: f.w.tick, until: f.w.tick + DAY, status: 'active', reason: 'staged', setAside: 0, aboutId: f.home.id, wants: {}, makes: '', sheltered: 0, worked: 4, ended: 0, reserve: 8, cue: 'season', step: '', stepKind: 'none', stepTarget: 0, stepItem: null, stepKey: null, blocked: '' });
    settleIntentions(f.w, f.ada);
    expect(f.ada.intentions[0].status).toBe('done');
    const hh = f.w.households.find((h) => h.id === f.ada.hhId)!;
    if (version === 53) expect(hh.reserveLaid).toEqual({ year: 0, by: f.ada.id, tick: f.w.tick });
    else expect(hh.reserveLaid).toBeUndefined();
  }
});

it('rules 53: meals from the laid reserve through the winter make the practice: the layer\'s own, the child\'s from her; a neighbour who laid none learns nothing', () => {
  const f = scene(53);
  f.w.tick = winterStart(0) - DAY;
  noteReserveLaid(f.w, f.ada);
  expect(isWinter(f.w)).toBe(false);
  // a meal before winter counts for nothing
  f.eat(f.ada);
  expect(f.ada.winterMeals).toBeUndefined();
  f.w.tick = winterStart(0) + 100;
  expect(isWinter(f.w)).toBe(true);
  // the child's first winter meal is a feed from Ada (the care gift); the rest he takes from the store himself, as a hungry child may
  f.feed(f.ben);
  expect(f.ben.winterMeals).toEqual({ year: 0, meals: 1 });
  for (let n = 0; n < PRACTICE_MEALS; n++) {
    f.eat(f.ada);
    if (n < PRACTICE_MEALS - 1) f.eat(f.ben);
    f.eat(f.cora);
  }
  expect(f.ada.winterMeals).toEqual({ year: 0, meals: PRACTICE_MEALS });
  expect(f.ben.winterMeals).toEqual({ year: 0, meals: PRACTICE_MEALS });
  expect(f.cora.winterMeals).toEqual({ year: 0, meals: PRACTICE_MEALS });
  expect(describeWinterPractice(f.w, f.ben)[0]).toBe("Eating from the household's winter stores: 3 meals this winter.");
  expect(f.ada.winterPractice).toBeUndefined();
  // winter ends on the first day of the new year (hardship.ts runs at tick 5 of the day)
  // (updateHardship runs before the tick advances, at tick 5 of the day)
  f.w.tick = TICKS_PER_YEAR + 5;
  stepWorld(f.w);
  expect(f.ada.winterPractice).toMatchObject({ source: 'laid', from: 0, year: 0, meals: PRACTICE_MEALS });
  expect(f.ben.winterPractice).toMatchObject({ source: 'family', from: f.ada.id, year: 0, meals: PRACTICE_MEALS });
  expect(f.cora.winterPractice).toBeUndefined();
  expect(f.ada.log.some((l) => /Keeping winter stores has become a practice: laid the reserve and ate 3 meals from it/.test(l.text))).toBe(true);
  expect(f.ben.log.some((l) => /Learned to keep winter stores from Ada: ate 3 meals from the reserve they laid/.test(l.text))).toBe(true);
  expect(describeWinterPractice(f.w, f.ben)[0]).toBe('Practice: keeping winter stores. Learned from Ada and eating 3 meals from it through the winter of year 1. The season cue opens 2 days earlier for them.');
  expect(f.ada.winterMeals).toBeUndefined();
  expect(conservationReport(f.w).ok).toBe(true);
});

it('rules 53: a holder\'s season cue opens two days earlier than a neighbour\'s, and the child holds it into adulthood', () => {
  // stores thin enough for the season cue (short of two days for the household) but not so low that the hardship cue fires first
  const f = scene(53, 10, 4);
  f.ada.winterPractice = { learned: 0, source: 'laid', from: 0, year: 0, meals: 3 };
  f.ben.winterPractice = { learned: 0, source: 'family', from: f.ada.id, year: 0, meals: 3 };
  expect(winterPracticeLead(f.w, f.ada)).toBe(PRACTICE_LEAD);
  expect(winterPracticeLead(f.w, f.cora)).toBe(0);
  // year 1: the holder's window opens PRACTICE_LEAD days before the ordinary one
  const early = winterStart(1) - (PREPARE_DAYS_WINTER_RESERVE + PRACTICE_LEAD) * DAY + 100;
  f.w.tick = early;
  for (const p of [f.ada, f.cora]) perceive(f.w, p);
  const adaWant = preparationWanted(generateOptions(f.w, f.ada, true, true));
  expect(adaWant?.cue).toBe('season');
  expect(adaWant?.why).toBe('winter is coming and we keep stores: the store is thin');
  expect(preparationWanted(generateOptions(f.w, f.cora, true, true))).toBeNull();
  f.w.tick = winterStart(1) - PREPARE_DAYS_WINTER_RESERVE * DAY + 100;
  for (const p of [f.ada, f.cora]) perceive(f.w, p);
  expect(preparationWanted(generateOptions(f.w, f.ada, true, true))?.why).toBe('winter is close and the store is thin');
  expect(preparationWanted(generateOptions(f.w, f.cora, true, true))?.cue).toBe('season');
  // the child, grown (a staged age), carries the practice into the cue
  f.w.tick = early;
  expect(preparationWanted(generateOptions(f.w, f.ben, true, true))).toBeNull();
  f.ben.birthTick = f.w.tick - 20 * TICKS_PER_YEAR;
  perceive(f.w, f.ben);
  expect(preparationWanted(generateOptions(f.w, f.ben, true, true))?.why).toBe('winter is coming and we keep stores: the store is thin');
});

it('rules 53: switch, exact replay, observer purity, hash coverage, and rules 52 unchanged', () => {
  const f = scene(53);
  f.w.tick = winterStart(0) + 100;
  noteReserveLaid(f.w, f.ada);
  f.eat(f.ada);
  const saved = serializeWorld(f.w);
  const hash = hashWorld(f.w);
  for (let i = 0; i < 3; i++) {
    observeNow(f.w, f.ada);
    describeWinterPractice(f.w, f.ada);
    preparationWanted(generateOptions(f.w, f.ada, true, true));
  }
  expect(serializeWorld(f.w)).toBe(saved);
  const copy = deserializeWorld(saved);
  for (let i = 0; i < 300; i++) {
    stepWorld(f.w);
    stepWorld(copy);
  }
  expect(serializeWorld(f.w)).toBe(serializeWorld(copy));
  const changed = deserializeWorld(saved);
  changed.persons.find((p) => p.id === f.ada.id)!.winterMeals!.meals = 2;
  expect(hashWorld(changed)).not.toBe(hash);
  const restore = parseIntervention('rich-no-winter-practice').install!();
  try {
    const g = scene(53);
    g.w.tick = winterStart(0) + 100;
    noteReserveLaid(g.w, g.ada);
    g.eat(g.ada);
    expect(g.w.households.find((h) => h.id === g.ada.hhId)!.reserveLaid).toBeUndefined();
    expect(g.ada.winterMeals).toBeUndefined();
    expect(winterPracticeLead(g.w, g.ada)).toBe(0);
  } finally {
    restore();
  }
  const old = scene(52);
  old.w.tick = winterStart(0) + 100;
  noteReserveLaid(old.w, old.ada);
  old.eat(old.ada);
  expect(old.ada.winterMeals).toBeUndefined();
  expect(old.w.households.find((h) => h.id === old.ada.hhId)!.reserveLaid).toBeUndefined();
});
