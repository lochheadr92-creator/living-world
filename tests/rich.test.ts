// Rich dynamics (mood.ts, hardship.ts): off by default and then invisible; when on, deterministic, saved, and doing what it says.
import { afterEach, describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { DAY } from '../src/sim/constants';
import { setStakes, coldSnap, growthRate, regrowRate, spoilPile, spoilStore, updateHardship, winterDepth, wolfNerve } from '../src/sim/hardship';
import { killPerson } from '../src/sim/lifecycle';
import { BREAK_LENGTH, isBreaking, sensitivity, setMoodEffects, moodWeight, quarrelFactor, think, thoughtsOf, updateMood } from '../src/sim/mood';
import { describePerson } from '../src/sim/inspect';
import { hashWorld } from '../src/sim/world';
import { natural, run } from './helpers/util';

const rich = (seed: string) => natural(seed, { dynamics: 'rich' });

describe('rich dynamics', () => {
  it('leave an ordinary world without a mood or a season', () => {
    const w = natural('rich-off');
    run(w, 1200);
    expect(w.persons.every((p) => p.mood === undefined)).toBe(true);
    expect(w.hardship).toBeUndefined();
    think(w, w.persons[0], 'x', -10, 100, 'x');
    expect(w.persons[0].mood).toBeUndefined();
  });

  it('give every person a mood, the same way every time', () => {
    const a = rich('rich-a');
    run(a, 900);
    const b = rich('rich-a');
    run(b, 900);
    expect(hashWorld(a)).toBe(hashWorld(b));
    expect(a.persons.filter((p) => p.alive).every((p) => p.mood !== undefined)).toBe(true);
    expect(hashWorld(a)).not.toBe(hashWorld((() => { const c = natural('rich-a'); run(c, 900); return c; })()));
  });

  it('save and load a rich world exactly', () => {
    const a = rich('rich-save');
    run(a, 600);
    think(a, a.persons[0], 'test', -20, 3000, 'testing');
    const b = deserializeWorld(serializeWorld(a));
    expect(hashWorld(b)).toBe(hashWorld(a));
    expect(b.persons[0].mood?.thoughts.some((t) => t.kind === 'test')).toBe(true);
    run(a, 300);
    run(b, 300);
    expect(hashWorld(b)).toBe(hashWorld(a));
  });

  it('renew a thought of the same kind, stack different ones, and let them fade', () => {
    const w = rich('rich-think');
    const p = w.persons[0];
    think(w, p, 'a', -20, 1000, 'one');
    think(w, p, 'a', -20, 1000, 'one again');
    think(w, p, 'b', -10, 1000, 'two');
    expect(p.mood!.thoughts.length).toBe(2);
    const fresh = p.mood!.level;
    w.tick += 500;
    p.mood!.level = 0;
    while ((w.tick + p.id) % 30 !== 0) w.tick++;
    updateMood(w, p);
    expect(p.mood!.level).toBeGreaterThan(fresh);
    w.tick += 2000;
    while ((w.tick + p.id) % 30 !== 0) w.tick++;
    updateMood(w, p);
    expect(thoughtsOf(w, p).filter((t) => t.why === 'one again' || t.why === 'two')).toEqual([]);
  });

  it('pull a low mood away from people and effort toward rest, and leave survival alone', () => {
    const w = rich('rich-weight');
    const p = w.persons[0];
    think(w, p, 'bad', -80, 5000, 'bad');
    expect(moodWeight(w, p, 'socialize')).toBeLessThan(0.7);
    expect(moodWeight(w, p, 'build')).toBeLessThan(0.85);
    expect(moodWeight(w, p, 'rest')).toBeGreaterThan(1.3);
    for (const k of ['eat', 'drink', 'sleep', 'flee', 'warm', 'fetch_water'] as const) expect(moodWeight(w, p, k)).toBe(1);
    expect(quarrelFactor(w, p)).toBeGreaterThan(1.4);
  });

  it('weigh a death on the family more than on a stranger', () => {
    const w = rich('rich-death');
    const alive = w.persons.filter((p) => p.alive);
    const dead = alive[0];
    const mate = alive.find((p) => p !== dead)!;
    const stranger = alive.find((p) => p !== dead && p !== mate && p.hhId !== dead.hhId && p.hhId !== mate.hhId)!;
    mate.relations[dead.id] = { affinity: 80, trust: 80, familiarity: 80, lastMet: 0, kin: 'partner', avoidUntil: 0, debt: 0, history: [], grievance: null, settledAt: 0 };
    killPerson(w, dead, 'test');
    const mourn = thoughtsOf(w, mate).find((t) => t.why.includes('died'));
    expect(mourn?.value).toBeLessThan(-50 * sensitivity(mate, 'lost') * 0.99 + 0.5);
    expect(mourn?.value).toBeLessThan(-25);
    expect(thoughtsOf(w, stranger).find((t) => t.why.includes('died'))).toBeUndefined();
  });

  it('begin lean seasons now and then, announce them, slow the land, and end them', () => {
    const w = rich('rich-lean');
    expect(regrowRate(w)).toBe(1);
    expect(growthRate(w)).toBe(1);
    let started = 0;
    let longest = 0;
    for (let day = 3; day < 400; day++) {
      w.tick = day * DAY + 5;
      const before = w.hardship;
      updateHardship(w);
      if (!before && w.hardship) {
        started++;
        expect(regrowRate(w)).toBeLessThan(1);
        expect(growthRate(w)).toBeLessThan(1);
        longest = Math.max(longest, w.hardship.until - w.hardship.since);
      }
    }
    expect(started).toBeGreaterThan(10);
    expect(started).toBeLessThan(80);
    expect(longest).toBeGreaterThanOrEqual(3 * DAY);
    expect(longest).toBeLessThanOrEqual(6 * DAY);
    w.tick = 1000 * DAY + 5;
    updateHardship(w);
    expect(w.hardship).toBeUndefined();
    expect(w.events.some((e) => e.text.startsWith('A lean season begins'))).toBe(true);
  });

  it('shows a person\'s thoughts in the inspector, and only in a rich world', () => {
    const off = natural('rich-view');
    run(off, 300);
    expect(describePerson(off, off.persons[0].id)!.thoughts).toBeNull();
    const w = rich('rich-view');
    run(w, 300);
    const p = w.persons.find((x) => x.alive)!;
    const calm = describePerson(w, p.id)!;
    expect(calm.thoughts).not.toBeNull();
    think(w, p, 'bite', -40, 3000, 'was bitten by a wolf');
    const sore = describePerson(w, p.id)!;
    expect(sore.thoughts!.some((t) => t.why === 'was bitten by a wolf' && t.value < -30)).toBe(true);
    expect(sore.mood).toBeLessThan(calm.mood);
  });

  it('inspecting a rich world never perturbs it', () => {
    const a = rich('rich-quiet');
    const b = rich('rich-quiet');
    for (let i = 0; i < 4; i++) {
      run(a, 200);
      run(b, 200);
      for (const p of b.persons) describePerson(b, p.id);
    }
    expect(hashWorld(b)).toBe(hashWorld(a));
  });

  it('has a winter at the end of every year, and nowhere else, only in a rich world', () => {
    const w = rich('rich-winter');
    const at = (day: number) => {
      w.tick = Math.round(day * DAY);
      return winterDepth(w);
    };
    expect(at(0)).toBe(0);
    expect(at(7.9)).toBe(0);
    expect(at(10)).toBeCloseTo(1, 5);
    expect(at(11.99)).toBeLessThan(0.05);
    expect(at(12 + 10)).toBeCloseTo(1, 5); // the same every year
    w.tick = 10 * DAY;
    expect(coldSnap(w)).toBeCloseTo(12, 5);
    expect(regrowRate(w)).toBeLessThan(0.5);
    expect(growthRate(w)).toBeLessThan(0.4);
    const off = natural('rich-winter-off');
    off.tick = 10 * DAY;
    expect(winterDepth(off)).toBe(0);
    expect(coldSnap(off)).toBe(0);
    expect(regrowRate(off)).toBe(1);
    expect(growthRate(off)).toBe(1);
  });

  it('makes food go off faster and wolves bolder, only in a rich world', () => {
    const w = rich('rich-stakes');
    const off = natural('rich-stakes');
    expect(spoilStore(off)).toBe(1);
    expect(spoilPile(off)).toBe(1);
    expect(spoilStore(w)).toBeGreaterThan(2);
    expect(spoilPile(w)).toBeGreaterThan(1);
    const a = wolfNerve(off);
    const b = wolfNerve(w);
    expect(a).toEqual({ rangeDay: 9, rangeNight: 17, chanceDay: 0.03, chanceNight: 0.22, prowl: 0.5, prowlCloser: 17, fire: 6 });
    expect(b.rangeNight).toBeGreaterThan(a.rangeNight);
    expect(b.chanceNight).toBeGreaterThan(a.chanceNight);
    expect(b.prowlCloser).toBeLessThan(a.prowlCloser);
    expect(b.fire).toBeLessThan(a.fire);
  });

  describe('the two halves, switched apart for experiments', () => {
    afterEach(() => {
      setStakes(true);
      setMoodEffects(true);
    });

    it('stakes off: a rich world has no winter, spoilage or bold wolves, but still has moods that count', () => {
      setStakes(false);
      const w = rich('rich-half-a');
      w.tick = 10 * DAY;
      expect(winterDepth(w)).toBe(0);
      expect(spoilStore(w)).toBe(1);
      expect(regrowRate(w)).toBe(1);
      expect(wolfNerve(w).chanceNight).toBe(0.22);
      const p = w.persons[0];
      think(w, p, 'bad', -80, 5000, 'bad');
      expect(moodWeight(w, p, 'socialize')).toBeLessThan(0.7);
    });

    it('mood effects off: stakes as before, thoughts still kept, but choices and quarrels unchanged', () => {
      setMoodEffects(false);
      const w = rich('rich-half-b');
      w.tick = 10 * DAY;
      expect(winterDepth(w)).toBeCloseTo(1, 5);
      expect(spoilStore(w)).toBeGreaterThan(2);
      const p = w.persons[0];
      think(w, p, 'bad', -80, 5000, 'bad');
      expect(p.mood!.level).toBeLessThan(-40);
      expect(moodWeight(w, p, 'socialize')).toBe(1);
      expect(quarrelFactor(w, p)).toBe(1);
    });
  });

  it('takes the same thing differently by person: the cautious feel a bite more, the sociable a row', () => {
    const w = rich('rich-sens');
    const [a, b] = w.persons;
    a.traits.caution = 1;
    b.traits.caution = 0;
    a.traits.sociability = 0;
    b.traits.sociability = 1;
    think(w, a, 'bitten', -30, 3000, 'bitten');
    think(w, b, 'bitten', -30, 3000, 'bitten');
    expect(a.mood!.thoughts[0].value).toBeLessThan(b.mood!.thoughts[0].value - 15);
    think(w, a, 'argued:9', -12, 3000, 'row');
    think(w, b, 'argued:9', -12, 3000, 'row');
    const row = (p: typeof a) => p.mood!.thoughts.find((t) => t.kind === 'argued:9')!.value;
    expect(row(b)).toBeLessThan(row(a) - 6);
    expect(sensitivity(a, 'hungry')).toBe(1);
  });

  it('reaches the end of its patience once, withdraws, may snap at a neighbour, and recovers', () => {
    const w = rich('rich-break');
    const p = w.persons.find((x) => x.alive)!;
    const aligned = () => {
      while ((w.tick + p.id) % 30 !== 0) w.tick++;
    };
    expect(isBreaking(w, p)).toBe(false);
    think(w, p, 'terrible', -90, 5000, 'terrible');
    aligned();
    updateMood(w, p);
    expect(isBreaking(w, p)).toBe(true);
    expect(w.events.some((e) => e.ids.includes(p.id) && /patience|argued/.test(e.text))).toBe(true);
    expect(moodWeight(w, p, 'socialize')).toBeLessThan(0.3);
    expect(moodWeight(w, p, 'build')).toBeLessThan(0.3);
    expect(moodWeight(w, p, 'rest')).toBeGreaterThan(1.5);
    expect(moodWeight(w, p, 'eat')).toBe(1);
    expect(quarrelFactor(w, p)).toBeGreaterThan(2.5);
    // it passes, they are relieved, and it does not happen again at once
    w.tick += BREAK_LENGTH + 40;
    aligned();
    updateMood(w, p);
    expect(isBreaking(w, p)).toBe(false);
    expect(thoughtsOf(w, p).some((t) => t.why === 'got it out of their system')).toBe(true);
    think(w, p, 'terrible2', -90, 5000, 'terrible');
    aligned();
    updateMood(w, p);
    expect(isBreaking(w, p)).toBe(false);
  });
});
