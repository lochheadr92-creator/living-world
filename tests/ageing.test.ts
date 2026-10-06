// How a life goes: mortality, vigour, fertility, and the age mix a world starts with.
import { describe, expect, it } from 'vitest';
import { carryCap, ageYears } from '../src/sim/people';
import { moveSpeed } from '../src/sim/activities';
import { INFANT_HAZARD, yearTicks, lifeDraw, childbirthRisk, fertilityAt, frailtyOf, mortalityPerYear, survival, vigourAt, workDrag } from '../src/sim/ageing';
import { LIFE_CHECK_EVERY, lifeTick } from '../src/sim/lifecycle';
import { TICKS_PER_YEAR } from '../src/sim/constants';
import { createWorld, defaultSettings } from '../src/sim/factory';
import { natural } from './helpers/util';

describe('mortality', () => {
  it('is highest in the first year, low through childhood and the prime, and rises steeply in old age', () => {
    const h = (a: number) => mortalityPerYear(a, 1);
    expect(h(0.5)).toBe(INFANT_HAZARD);
    expect(h(0.5)).toBeGreaterThan(h(2));
    expect(h(2)).toBeGreaterThan(h(8));
    expect(h(8)).toBeGreaterThan(h(20));
    for (let a = 25; a < 90; a += 5) expect(h(a + 5)).toBeGreaterThan(h(a));
    expect(h(80)).toBeGreaterThan(5 * h(40));
    // the baseline (apart from illness) climbs steeply in old age: roughly quintuple from seventy to eighty
    expect(h(80) / h(70)).toBeGreaterThan(3.5);
    expect(h(80) / h(70)).toBeLessThan(6.5);
  });

  it('is worse for the frail and for the unwell, and neither can make it negative or silly', () => {
    expect(mortalityPerYear(60, 1.5)).toBeGreaterThan(mortalityPerYear(60, 1));
    expect(mortalityPerYear(60, 0.7)).toBeLessThan(mortalityPerYear(60, 1));
    expect(mortalityPerYear(40, 1, 20)).toBeGreaterThan(mortalityPerYear(40, 1, 100));
    expect(mortalityPerYear(40, 1, 100)).toBe(mortalityPerYear(40, 1));
    for (const a of [0, 5, 30, 60, 90]) for (const f of [0.6, 1, 1.9]) expect(mortalityPerYear(a, f, 0)).toBeGreaterThan(0);
  });

  it('is calibrated, illness included: of people who reach fifteen, about 98% see forty, 92% sixty, 79% seventy, 54% eighty, 18% ninety', () => {
    // averaged over the spread of frailty a world actually has
    const w = natural('age-calibration');
    const fr: number[] = [];
    for (let id = 1; id <= 600; id++) fr.push(frailtyOf(w, { id } as never));
    const avg = (to: number) => fr.reduce((s, f) => s + survival(15, to, f), 0) / fr.length;
    expect(avg(40)).toBeGreaterThan(0.95);
    expect(avg(40)).toBeLessThan(0.99);
    expect(avg(60)).toBeGreaterThan(0.88);
    expect(avg(60)).toBeLessThan(0.95);
    expect(avg(70)).toBeGreaterThan(0.74);
    expect(avg(70)).toBeLessThan(0.85);
    expect(avg(80)).toBeGreaterThan(0.48);
    expect(avg(80)).toBeLessThan(0.61);
    expect(avg(90)).toBeGreaterThan(0.11);
    expect(avg(90)).toBeLessThan(0.26);
    // and a newborn has better than a nine in ten chance of reaching fifteen
    const born = fr.reduce((s, f) => s + survival(0, 15, f), 0) / fr.length;
    expect(born).toBeGreaterThan(0.9);
    expect(born).toBeLessThan(0.98);
  });
});

describe('frailty', () => {
  it('is inborn: fixed by the seed and the person, spread between about 0.6 and 1.9, and different from person to person', () => {
    const a = natural('frail-a');
    const b = natural('frail-a');
    const c = natural('frail-b');
    const fa = a.persons.map((p) => frailtyOf(a, p));
    expect(fa).toEqual(b.persons.map((p) => frailtyOf(b, p)));
    expect(fa).not.toEqual(c.persons.map((p) => frailtyOf(c, p)));
    for (const f of fa) {
      expect(f).toBeGreaterThanOrEqual(0.6);
      expect(f).toBeLessThanOrEqual(1.9);
    }
    expect(Math.max(...fa) - Math.min(...fa)).toBeGreaterThan(0.3);
  });
});

describe('vigour, fertility and what they change', () => {
  it('vigour is full in the prime, fades from the mid-forties (earlier if frail), and has a floor', () => {
    expect(vigourAt(10, 1)).toBe(1);
    expect(vigourAt(30, 1)).toBe(1);
    expect(vigourAt(40, 1)).toBe(1);
    expect(vigourAt(60, 1)).toBeLessThan(1);
    expect(vigourAt(75, 1)).toBeLessThan(vigourAt(60, 1));
    expect(vigourAt(95, 1)).toBeCloseTo(0.45, 6);
    expect(vigourAt(55, 1.6)).toBeLessThan(vigourAt(55, 0.8));
  });

  it('fertility is full to thirty, falls to nothing by forty-five, and is nothing before seventeen', () => {
    expect(fertilityAt(16)).toBe(0);
    expect(fertilityAt(20)).toBe(1);
    expect(fertilityAt(30)).toBe(1);
    expect(fertilityAt(38)).toBeGreaterThan(0);
    expect(fertilityAt(38)).toBeLessThan(1);
    expect(fertilityAt(44.9)).toBeLessThan(0.1);
    expect(fertilityAt(45)).toBe(0);
  });

  it('the same person at eighty walks slower, carries less and works slower than at thirty', () => {
    const w = natural('age-effects');
    const p = w.persons.find((q) => q.alive && ageYears(w, q) > 20)!;
    p.health = 100;
    p.needs.energy = 100;
    p.inv = {};
    p.cartId = 0;
    const at = (age: number) => {
      p.birthTick = w.tick - Math.round(age * TICKS_PER_YEAR);
      return { speed: moveSpeed(w, p), carry: carryCap(w, p), drag: workDrag(w, p, ageYears(w, p)) };
    };
    const prime = at(30);
    const old = at(80);
    expect(old.speed).toBeLessThan(prime.speed);
    expect(old.speed).toBeGreaterThan(0.7 * prime.speed); // slower, not helpless
    expect(old.carry).toBeLessThan(prime.carry);
    expect(old.carry).toBeGreaterThanOrEqual(7);
    expect(prime.drag).toBe(1);
    expect(old.drag).toBeGreaterThan(1.2);
    expect(old.drag).toBeLessThan(1.7);
  });

  it('a birth carries a small risk to the mother that grows with age and frailty', () => {
    expect(childbirthRisk(25, 1)).toBeCloseTo(0.01, 6);
    expect(childbirthRisk(40, 1)).toBeGreaterThan(childbirthRisk(25, 1));
    expect(childbirthRisk(25, 1.6)).toBeGreaterThan(childbirthRisk(25, 0.8));
    expect(childbirthRisk(25, 1.9)).toBeLessThan(0.05);
  });
});

describe('life pace', () => {
  it('is the number of days a year of life takes: ages, births and the chance of dying all keep to it', () => {
    const slow = natural('pace-seed', { daysPerYear: 24 });
    const normal = natural('pace-seed');
    expect(yearTicks(normal)).toBe(12 * 2400);
    expect(yearTicks(slow)).toBe(24 * 2400);
    // the same people are the same age in years, but their birthdays are twice as far back
    const a = normal.persons.map((p) => ageYears(normal, p));
    const b = slow.persons.map((p) => ageYears(slow, p));
    for (let i = 0; i < a.length; i++) expect(b[i]).toBeCloseTo(a[i], 3);
    expect(Math.abs(slow.persons[0].birthTick)).toBeCloseTo(2 * Math.abs(normal.persons[0].birthTick), -1);
    // a world that does not say (an older save) keeps the default
    expect(yearTicks({ settings: {} })).toBe(12 * 2400);
    // the same person has half the chance of dying on a given check when a year takes twice as long
    const perCheck = (w: typeof slow) => 1 - Math.exp((-mortalityPerYear(80, 1) * LIFE_CHECK_EVERY) / yearTicks(w));
    expect(perCheck(slow)).toBeCloseTo(perCheck(normal) / 2, 6);
  });
});

describe('chance is specific to the world', () => {
  it('the same person has different luck in different worlds (people have the same ids everywhere), and the same luck in the same world', () => {
    const a = natural('luck-a');
    const b = natural('luck-b');
    const a2 = natural('luck-a');
    const pa = a.persons[3];
    const pb = { id: pa.id } as typeof pa; // the same id, in another world
    let same = 0;
    let identical = 0;
    for (let step = 0; step < 2000; step++) {
      if (lifeDraw(a, pa, step, 91) === lifeDraw(b, pb, step, 91)) same++;
      if (lifeDraw(a, pa, step, 91) === lifeDraw(a2, pa, step, 91)) identical++;
    }
    expect(same).toBe(0);
    expect(identical).toBe(2000);
    // and the moments at which a hazard would strike differ between worlds
    const strikes = (w: typeof a, p: typeof pa) => Array.from({ length: 200000 }, (_, i) => i).filter((i) => lifeDraw(w, p, i, 91) < 0.0005);
    expect(strikes(a, pa)).not.toEqual(strikes(b, pb));
  });
});

describe('dying of ordinary causes', () => {
  it('is decided by a hash, not the random stream, so it never disturbs anything else; and it happens, at the right ages and for the right reasons', () => {
    const w = natural('age-deaths');
    const rngBefore = JSON.stringify(w.rng);
    const p = w.persons.find((q) => q.alive)!;
    p.birthTick = w.tick - Math.round(92 * TICKS_PER_YEAR);
    let years = 0;
    let causeOfDeath = '';
    for (let step = 0; step < 60 * (TICKS_PER_YEAR / LIFE_CHECK_EVERY) && p.alive; step++) {
      w.tick += LIFE_CHECK_EVERY;
      lifeTick(w, p);
      years = step / (TICKS_PER_YEAR / LIFE_CHECK_EVERY);
    }
    causeOfDeath = w.deceased.find((d) => d.id === p.id)?.cause ?? '';
    expect(p.alive).toBe(false);
    expect(years).toBeLessThan(15); // at ninety-two, a one-in-four or worse chance a year
    expect(['old age', 'illness']).toContain(causeOfDeath);
    expect(JSON.stringify(w.rng)).toBe(rngBefore);

    // a baby is far likelier to die than a young adult, and the cause is a childhood illness
    const w2 = natural('age-deaths-2');
    const baby = w2.persons.find((q) => q.alive)!;
    baby.birthTick = w2.tick;
    let died = false;
    for (let step = 0; step < 10 * (TICKS_PER_YEAR / LIFE_CHECK_EVERY) && baby.alive; step++) {
      w2.tick += LIFE_CHECK_EVERY;
      lifeTick(w2, baby);
      if (!baby.alive) died = true;
    }
    if (died) expect(w2.deceased.find((d) => d.id === baby.id)!.cause).toBe('a childhood illness');
  });

  it('does not touch someone in the prime on any given day', () => {
    const w = natural('age-prime');
    const p = w.persons.find((q) => q.alive && ageYears(w, q) > 22 && ageYears(w, q) < 40)!;
    for (let step = 0; step < 10 * (2400 / LIFE_CHECK_EVERY); step++) {
      w.tick += LIFE_CHECK_EVERY;
      lifeTick(w, p);
    }
    expect(p.alive).toBe(true); // ten days at a prime-of-life hazard of under 1% a year
  });
});

describe('the age mix a world starts with', () => {
  it('is spread from infancy to the eighties, with children, a working middle, and a few elders', () => {
    let elders = 0;
    for (const seed of ['meadow', 'river', 'fern', 'aspen']) {
      const w = createWorld(defaultSettings(seed));
      const ages = w.persons.map((p) => ageYears(w, p));
      expect(Math.min(...ages), seed).toBeGreaterThan(0);
      expect(Math.max(...ages), seed).toBeGreaterThan(65);
      expect(Math.max(...ages), seed).toBeLessThan(90);
      expect(ages.filter((a) => a < 12).length, seed).toBeGreaterThanOrEqual(3);
      expect(ages.filter((a) => a >= 17 && a < 62).length, seed).toBeGreaterThanOrEqual(12);
      expect(ages.filter((a) => a >= 62).length, seed).toBeGreaterThanOrEqual(1);
      elders += ages.filter((a) => a >= 62).length;
    }
    expect(elders).toBeGreaterThanOrEqual(6); // across four worlds, so there are old people to see die and to learn from
  });
});
