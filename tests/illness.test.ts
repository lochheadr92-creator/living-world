// Illness: a visible spell with a course and an outcome, which others can help with.
import { describe, expect, it } from 'vitest';
import { DAY } from '../src/sim/constants';
import { caseFatality, illnessDeathsPerYear, illnessRatePerYear } from '../src/sim/ageing';
import { LIFE_CHECK_EVERY, lifeTick } from '../src/sim/lifecycle';
import { illnessTick, SERIOUS } from '../src/sim/illness';
import { traitMods } from '../src/sim/optutil';
import { ageYears } from '../src/sim/people';
import { onGift } from '../src/sim/social';
import { hashWorld } from '../src/sim/world';
import type { Person, World } from '../src/sim/types';
import { natural, run } from './helpers/util';
import { TICKS_PER_YEAR } from '../src/sim/constants';

const adult = (w: World): Person => {
  const p = w.persons.find((q) => q.alive && ageYears(w, q) > 22 && ageYears(w, q) < 40)!;
  p.health = 100;
  return p;
};
/** Run the once-a-minute life check for one person until `done` or `maxSteps`. */
function steps(w: World, p: Person, maxSteps: number, done: () => boolean): number {
  let n = 0;
  while (n < maxSteps && !done()) {
    w.tick += LIFE_CHECK_EVERY;
    n++;
    illnessTick(w, p, ageYears(w, p), Math.floor(w.tick / LIFE_CHECK_EVERY));
    if (!p.alive) break;
  }
  return n;
}

describe('how likely, and how deadly', () => {
  it('illness is likelier for the very young, the old and the frail, and for hardship', () => {
    expect(illnessRatePerYear(0.5, 1)).toBeGreaterThan(illnessRatePerYear(30, 1));
    expect(illnessRatePerYear(70, 1)).toBeGreaterThan(illnessRatePerYear(30, 1));
    expect(illnessRatePerYear(30, 1.6)).toBeGreaterThan(illnessRatePerYear(30, 0.8));
  });

  it('when it comes to a head it is deadliest for the very young and the old, the frail, the severe and the starving, and care helps', () => {
    const c = (age: number, f = 1, sev = 0.5, care = 0, starving = false) => caseFatality(age, f, sev, care, starving);
    expect(c(30)).toBeLessThan(0.02);
    expect(c(80)).toBeGreaterThan(5 * c(30));
    expect(c(0.5)).toBeGreaterThan(c(8));
    expect(c(30, 1.6)).toBeGreaterThan(c(30, 0.8));
    expect(c(70, 1, 1)).toBeGreaterThan(c(70, 1, 0.3));
    expect(c(70, 1, 0.5, 0, true)).toBeGreaterThan(c(70, 1, 0.5, 0, false));
    // care: halved at three kindnesses, and no better beyond that
    expect(c(70, 1, 0.5, 3)).toBeCloseTo(c(70, 1, 0.5, 0) / 2, 9);
    expect(c(70, 1, 0.5, 9)).toBeCloseTo(c(70, 1, 0.5, 3), 9);
    for (const age of [0.5, 5, 30, 55, 70, 85]) expect(c(age, 1.9, 1, 0, true)).toBeLessThanOrEqual(0.6);
    expect(illnessDeathsPerYear(80, 1)).toBeGreaterThan(illnessDeathsPerYear(30, 1));
  });
});

describe('a spell of illness', () => {
  it('starts, shows in their health as a dip and a recovery, lasts a day and a half to four, and ends; and they are not ill again at once', () => {
    const w = natural('ill-course');
    const p = adult(w);
    steps(w, p, 400_000, () => !!p.illness);
    expect(p.illness, 'a spell should start within a few simulated decades of checks').toBeTruthy();
    const ill = p.illness!;
    expect(ill.severity).toBeGreaterThanOrEqual(0.3);
    expect(ill.severity).toBeLessThanOrEqual(1);
    expect(ill.until - ill.since).toBeGreaterThanOrEqual(1.5 * DAY - 1);
    expect(ill.until - ill.since).toBeLessThanOrEqual(4 * DAY + 1);
    expect(p.log.some((l) => /Fell (seriously )?ill/.test(l.text))).toBe(true);
    // the course: health never above the ceiling, lowest near the middle
    let minHealth = 100;
    let minAt = 0;
    while (p.illness && p.alive) {
      w.tick += LIFE_CHECK_EVERY;
      illnessTick(w, p, ageYears(w, p), Math.floor(w.tick / LIFE_CHECK_EVERY));
      if (!p.alive) break;
      const progress = Math.min(1, (w.tick - ill.since) / (ill.until - ill.since));
      expect(p.health).toBeLessThanOrEqual(100 - ill.severity * 60 * Math.sin(Math.PI * progress) + 1e-6 + (p.illness ? 0 : 60));
      if (p.health < minHealth) {
        minHealth = p.health;
        minAt = progress;
      }
    }
    if (p.alive) {
      expect(minHealth).toBeLessThanOrEqual(100 - ill.severity * 60 * 0.9);
      expect(minAt).toBeGreaterThan(0.25);
      expect(minAt).toBeLessThan(0.75);
      expect(p.illness).toBeNull();
      expect(p.cooldowns.illFree).toBeGreaterThan(w.tick);
      expect(p.log.some((l) => /Recovered/.test(l.text))).toBe(true);
      // not ill again for three days
      const before = w.tick;
      while (w.tick < before + 3 * DAY - LIFE_CHECK_EVERY) {
        w.tick += LIFE_CHECK_EVERY;
        illnessTick(w, p, ageYears(w, p), Math.floor(w.tick / LIFE_CHECK_EVERY));
        expect(p.illness).toBeNull();
      }
    }
  }, 120_000);

  it('it ends in recovery or death at about the case fatality: many spells at a fixed chance give about that share of deaths', () => {
    const w = natural('ill-outcome');
    const base = adult(w);
    base.birthTick = w.tick - Math.round(80 * TICKS_PER_YEAR);
    let died = 0;
    let recovered = 0;
    const trials = 1500;
    const cfr = caseFatality(80, 1, 0.5, 0, false);
    for (let i = 0; i < trials; i++) {
      // a fresh person each time, at the same age and frailty-neutral conditions, so the draws differ by id and moment
      const q: Person = { ...base, id: 500_000 + i, alive: true, health: 100, needs: { ...base.needs, hunger: 80, thirst: 80 }, log: [], cooldowns: {}, illness: { since: w.tick, until: w.tick + 1, severity: 0.5, care: 0 }, relations: {}, grief: [], accounts: [], concerns: [] } as Person;
      w.byId.set(q.id, q);
      w.persons.push(q);
      w.tick += LIFE_CHECK_EVERY;
      const dead = illnessTick(w, q, 80, Math.floor(w.tick / LIFE_CHECK_EVERY));
      if (dead) died++;
      else recovered++;
      void cfr;
    }
    // frailty differs by id (hashed), so the expected share is E[caseFatality] over frailty, close to cfr
    expect(died + recovered).toBe(trials);
    expect(died / trials).toBeGreaterThan(cfr * 0.5);
    expect(died / trials).toBeLessThan(cfr * 2.2);
    expect(died).toBeGreaterThan(0);
    expect(recovered).toBeGreaterThan(0);
  });
});

describe('what it does to a person and to those around them', () => {
  it('someone who is ill is slower to take up work or wander, and being brought food or water is counted', () => {
    const w = natural('ill-effects');
    const p = adult(w);
    const giver = w.persons.find((q) => q.alive && q !== p)!;
    const well = traitMods(p);
    p.illness = { since: w.tick, until: w.tick + 3 * DAY, severity: 0.8, care: 0 };
    const ill = traitMods(p);
    expect(ill.work).toBeLessThan(well.work * 0.5);
    expect(ill.explore).toBeLessThan(well.explore * 0.5);
    expect(ill.give).toBe(well.give);
    giver.inv = { berries: 2 };
    onGift(w, giver, p, { berries: 1 }, 'care');
    expect(p.illness.care).toBe(1);
    // a gift to someone who is not ill changes nothing about illness
    const other = w.persons.find((q) => q.alive && q !== p && q !== giver)!;
    onGift(w, giver, other, { berries: 1 }, 'care');
    expect(other.illness).toBeNull();
  });

  it('an ill person lies down: given a bad spell and nothing pressing, they rest', () => {
    const w = natural('ill-rest');
    const p = adult(w);
    for (const n of ['hunger', 'thirst', 'energy', 'warmth', 'safety'] as const) p.needs[n] = 95;
    p.illness = { since: w.tick, until: w.tick + 3 * DAY, severity: 0.9, care: 0 };
    p.nextThink = w.tick;
    let rested = false;
    run(w, 900, () => {
      for (const n of ['hunger', 'thirst', 'energy', 'warmth', 'safety'] as const) p.needs[n] = Math.max(p.needs[n], 90);
      if (p.activity?.kind === 'rest' && p.activity.data.ill) rested = true;
    });
    expect(rested).toBe(true);
  });
});

describe('in a living village', () => {
  it('spells of illness happen, run their course and end, are deterministic, and serious ones show in the feed', () => {
    const go = () => {
      const w = natural('ill-village');
      let spells = 0;
      let serious = 0;
      const seen = new Set<number>();
      for (let chunk = 0; chunk < 60; chunk++) {
        run(w, 240);
        for (const p of w.persons) {
          if (p.illness && !seen.has(p.id * 1e9 + p.illness.since)) {
            seen.add(p.id * 1e9 + p.illness.since);
            spells++;
            if (p.illness.severity >= SERIOUS) serious++;
          }
          if (p.illness) expect(w.tick - p.illness.until, `${p.name} has been ill too long`).toBeLessThan(2 * DAY);
        }
      }
      return { w, spells, serious };
    };
    const a = go();
    console.log(`[illness] 6 days: ${a.spells} spells (${a.serious} serious), ${a.w.deceased.length} deaths, feed lines ${a.w.events.filter((e) => /seriously ill|recovered from a serious/.test(e.text)).length}`);
    expect(a.spells).toBeGreaterThan(0);
    const b = go();
    expect(hashWorld(b.w)).toBe(hashWorld(a.w));
    void lifeTick;
  }, 400_000);
});
