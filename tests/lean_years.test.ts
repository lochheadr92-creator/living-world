// Rules 220: lean years (src/sim/lean_years.ts; the roll in hardship.ts updateHardship). Every situation here is STAGED: the daily
// hardship check is driven directly, one call a day, so these check the rule; they are not examples of an ordinary world. Each
// check has the rules-216 contrast.
import { afterEach, describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { DAY, DAYS_PER_YEAR } from '../src/sim/constants';
import { LEAN_CHANCE, WINTER_LENGTH, growthRate, regrowRate, updateHardship } from '../src/sim/hardship';
import { LEAN_GAP_MAX, LEAN_GAP_MIN, LEAN_START_DAYS, LEAN_YEARS_PARTS, isLeanYear, leanStartDay, setLeanSeasons, setLeanYears } from '../src/sim/lean_years';
import { hashString } from '../src/sim/rng';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import type { World } from '../src/sim/types';
import { natural } from './helpers/util';

afterEach(() => {
  setLeanYears(true);
  setLeanSeasons(true);
});

const SEEDS = ['aspen', 'birch', 'cedar', 'fern', 'gen-1', 'gen-2', 'gen-3', 'gen-4', 'gen-5', 'gen-6', 'meadow', 'river'];
const world = (seed: string, version: number): World => natural(seed, { dynamics: 'rich', rulesVersion: version });

interface Start {
  day: number;
  kind: 'lean' | 'dry';
  length: number;
}
/** Drive the daily hardship check for `years` years (one call a day, at the tick the engine makes it) and list what began. */
function calendar(w: World, years: number, from = 2): Start[] {
  const out: Start[] = [];
  for (let day = from; day < years * DAYS_PER_YEAR; day++) {
    w.tick = day * DAY + 5;
    const before = w.hardship;
    updateHardship(w);
    if (w.hardship && w.hardship !== before) out.push({ day, kind: w.hardship.kind, length: w.hardship.until - w.hardship.since });
  }
  return out;
}
const yearOf = (day: number): number => Math.floor(day / DAYS_PER_YEAR);
const leanYearsIn = (seed: string, years: number): number[] => {
  const key = hashString(seed);
  const out: number[] = [];
  for (let y = 0; y < years; y++) if (isLeanYear(key, y)) out.push(y);
  return out;
};

describe('rules 220 is registered', () => {
  it('is registered and supported (the current version may be later), with one part and its figures', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(220);
    expect(SUPPORTED_RULES_VERSIONS).toContain(220);
    expect(LEAN_YEARS_PARTS).toEqual(['rare']);
    expect([LEAN_GAP_MIN, LEAN_GAP_MAX, LEAN_START_DAYS]).toEqual([2, 3, 8]);
    // the season begins on a day before winter sets in
    expect(LEAN_START_DAYS).toBe(DAYS_PER_YEAR - WINTER_LENGTH);
  });
});

describe('the calendar of lean years', () => {
  it('puts the first lean year in the second or third year and each one after two or three years later, for every lab seed', () => {
    for (const seed of SEEDS) {
      const years = leanYearsIn(seed, 60);
      expect([1, 2]).toContain(years[0]);
      for (let i = 1; i < years.length; i++) expect([2, 3]).toContain(years[i] - years[i - 1]);
      // 60 years hold between 20 and 30 lean years, so the land is lean far less often than one day in two
      expect(years.length).toBeGreaterThanOrEqual(19);
      expect(years.length).toBeLessThanOrEqual(30);
      for (const y of years) {
        const d = leanStartDay(hashString(seed), y);
        expect(d).toBeGreaterThanOrEqual(0);
        expect(d).toBeLessThan(LEAN_START_DAYS);
        expect(Number.isInteger(d)).toBe(true);
      }
    }
  });

  it('is fixed by the seed: the same seed gives the same years, and seeds differ', () => {
    expect(leanYearsIn('aspen', 40)).toEqual(leanYearsIn('aspen', 40));
    const distinct = new Set(SEEDS.map((s) => leanYearsIn(s, 40).join(',')));
    expect(distinct.size).toBeGreaterThan(1);
  });
});

describe('what begins, year by year', () => {
  it('at 216 a lean season begins many times in ten years; at 220 once in each lean year, on its day, and nowhere else', () => {
    for (const seed of ['aspen', 'meadow', 'gen-5']) {
      const old = calendar(world(seed, 216), 10).filter((s) => s.kind === 'lean');
      const now = calendar(world(seed, 220), 10).filter((s) => s.kind === 'lean');
      const key = hashString(seed);
      // the old daily roll, checked once a day as this driver does: a lean season in most years
      expect(old.length).toBeGreaterThanOrEqual(7);
      // the lean years of the first ten years, each with exactly one season, begun on the day the seed gives
      const due = leanYearsIn(seed, 10);
      expect(now.map((s) => yearOf(s.day))).toEqual(due);
      for (const s of now) expect(s.day % DAYS_PER_YEAR).toBe(leanStartDay(key, yearOf(s.day)));
      expect(now.length).toBeGreaterThanOrEqual(3);
      expect(now.length).toBeLessThanOrEqual(5);
      expect(old.length).toBeGreaterThan(now.length + 2);
    }
  });

  it('at 220 no dry spell begins in a lean year, and dry spells still come in other years', () => {
    let dryElsewhere = 0;
    for (const seed of SEEDS) {
      const key = hashString(seed);
      for (const s of calendar(world(seed, 220), 20)) {
        if (s.kind !== 'dry') continue;
        expect(isLeanYear(key, yearOf(s.day))).toBe(false);
        dryElsewhere++;
      }
    }
    expect(dryElsewhere).toBeGreaterThan(0);
  });

  it('a lean season, once begun, is what it always was: three to six days, wild food at a tenth and crops at a quarter', () => {
    const w = world('aspen', 220);
    const key = hashString('aspen');
    const year = leanYearsIn('aspen', 10)[0];
    const day = year * DAYS_PER_YEAR + leanStartDay(key, year);
    w.tick = day * DAY + 5;
    expect(regrowRate(w)).toBe(1);
    updateHardship(w);
    expect(w.hardship?.kind).toBe('lean');
    const length = w.hardship!.until - w.hardship!.since;
    expect(length).toBeGreaterThanOrEqual(3 * DAY);
    expect(length).toBeLessThanOrEqual(6 * DAY);
    expect(regrowRate(w)).toBeCloseTo(0.1, 10);
    expect(growthRate(w)).toBeCloseTo(0.25, 10);
    expect(w.events.some((e) => e.text.startsWith('A lean season begins'))).toBe(true);
    // and it ends
    w.tick = w.hardship!.until;
    updateHardship(w);
    expect(w.hardship).toBeUndefined();
  });

  it('a dry spell that ends on the morning a lean season is due does not swallow it (at 216 the ending returned first)', () => {
    const key = hashString('aspen');
    const year = leanYearsIn('aspen', 10)[0];
    const tick = (year * DAYS_PER_YEAR + leanStartDay(key, year)) * DAY + 5;
    const now = world('aspen', 220);
    now.tick = tick;
    now.hardship = { kind: 'dry', since: tick - 3 * DAY, until: tick };
    updateHardship(now);
    expect(now.hardship?.kind).toBe('lean');
    // the same morning with the part switched off: the dry spell ends and nothing begins on that call, as before 220
    setLeanYears(false);
    const off = world('aspen', 220);
    off.tick = tick;
    off.hardship = { kind: 'dry', since: tick - 3 * DAY, until: tick };
    updateHardship(off);
    expect(off.hardship).toBeUndefined();
  });
});

describe('the switches', () => {
  it('with the part switched off a rules-220 world keeps the daily roll, exactly as a rules-216 world does', () => {
    const old = calendar(world('birch', 216), 8);
    setLeanYears(false);
    const off = calendar(world('birch', 220), 8);
    expect(off).toEqual(old);
    expect(old.filter((s) => s.kind === 'lean').length).toBeGreaterThan(5);
  });

  it('the old daily roll is the documented one chance in five', () => {
    expect(LEAN_CHANCE).toBe(0.2);
  });

  it('the diagnostic switch removes every lean season at either version and leaves dry spells', () => {
    setLeanSeasons(false);
    for (const version of [216, 220]) {
      const starts = calendar(world('cedar', version), 20);
      expect(starts.filter((s) => s.kind === 'lean')).toEqual([]);
      expect(starts.filter((s) => s.kind === 'dry').length).toBeGreaterThan(0);
    }
  });

  it('an authored world and an unversioned rich world are untouched', () => {
    const authored = natural('aspen', { dynamics: 'authored', rulesVersion: 220 });
    expect(calendar(authored, 10)).toEqual([]);
    const unversioned = calendar(natural('aspen', { dynamics: 'rich' }), 10).filter((s) => s.kind === 'lean');
    expect(unversioned.length).toBeGreaterThanOrEqual(7);
  });
});

describe('saving', () => {
  it('saves nothing new: a loaded world in a lean season carries it and reaches the same calendar afterwards', () => {
    const w = world('aspen', 220);
    const key = hashString('aspen');
    const year = leanYearsIn('aspen', 10)[0];
    const day = year * DAYS_PER_YEAR + leanStartDay(key, year);
    w.tick = day * DAY + 5;
    updateHardship(w);
    expect(w.hardship?.kind).toBe('lean');
    const copy = deserializeWorld(serializeWorld(w));
    expect(copy.hardship).toEqual(w.hardship);
    const a = calendar(w, 12, day + 1);
    const b = calendar(copy, 12, day + 1);
    expect(b).toEqual(a);
    expect(a.some((s) => s.kind === 'lean')).toBe(true);
  });
});
