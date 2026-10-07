// Rich dynamics (mood.ts, hardship.ts): off by default and then invisible; when on, deterministic, saved, and doing what it says.
import { describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { DAY } from '../src/sim/constants';
import { updateHardship, regrowRate, growthRate } from '../src/sim/hardship';
import { killPerson } from '../src/sim/lifecycle';
import { moodWeight, quarrelFactor, think, thoughtsOf, updateMood } from '../src/sim/mood';
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
    expect(moodWeight(p, 'socialize')).toBeLessThan(0.7);
    expect(moodWeight(p, 'build')).toBeLessThan(0.85);
    expect(moodWeight(p, 'rest')).toBeGreaterThan(1.3);
    for (const k of ['eat', 'drink', 'sleep', 'flee', 'warm', 'fetch_water'] as const) expect(moodWeight(p, k)).toBe(1);
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
    expect(mourn?.value).toBeLessThan(-40);
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
});
