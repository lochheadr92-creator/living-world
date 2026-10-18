// A life of one's own (src/sim/life.ts): a hope taken up on coming of age that nudges what serves it and is read from the world;
// an injury that slows walking and work and heals with time; an elder who carries less and mends slower; none of it in an
// authored world.
import { describe, expect, it } from 'vitest';
import { moveSpeed } from '../src/sim/activities';
import { DAY, TICKS_PER_YEAR, AGE_ELDER } from '../src/sim/constants';
import { createWorld } from '../src/sim/factory';
import { GOAL_NUDGE, goalNudge, goalProgress, injure, injuryFactor, lifeTickRich, riskOfHarm } from '../src/sim/life';
import { carryCap, stageOf } from '../src/sim/people';
import { settingsForProfile } from '../src/sim/profiles';
import { taskMultiplier } from '../src/sim/tools';
import { stepWorld } from '../src/sim/world';
import type { Option } from '../src/sim/optutil';
import type { World } from '../src/sim/types';

const world = (dynamics: 'authored' | 'rich'): World => createWorld(settingsForProfile('normal', 'meadow', { immigration: false, dynamics }));
const adult = (w: World) => w.persons.find((p) => p.alive && stageOf(w, p) === 'adult')!;
const tickFor = (w: World, p: { id: number }): void => {
  while ((w.tick + p.id * 53) % (DAY / 2) !== 0) w.tick++;
};
const opt = (kind: Option['kind'], tag = ''): Option => ({ kind, label: '', goal: '', need: null, util: 10, parts: [], eta: 0, key: 'k', targetId: 0, tag });

describe('a hope', () => {
  const w = world('rich');
  const p = adult(w);

  it('is taken up by an adult, nudges what serves it, and is read from the world rather than the person', () => {
    tickFor(w, p);
    lifeTickRich(w, p);
    expect(p.goal).toBeTruthy();
    expect(p.goal!.done).toBe(0);
    expect(p.log.some((l) => l.text.startsWith('What I hope for'))).toBe(true);
    p.goal!.kind = 'family';
    p.partnerId = 0;
    p.children = [];
    expect(goalProgress(w, p, p.goal!)).toBe(0);
    expect(goalNudge(w, p, opt('socialize', 'household'))).toBe(GOAL_NUDGE);
    expect(goalNudge(w, p, opt('gather'))).toBe(0);
  });

  it('is reached when the world says so, lifts the mood for days, and nudges nothing after', () => {
    p.partnerId = w.persons.find((q) => q !== p)!.id;
    p.children = [w.persons.find((q) => q !== p && q.id !== p.partnerId)!.id];
    tickFor(w, p);
    lifeTickRich(w, p);
    expect(p.goal!.done).toBe(w.tick);
    expect(w.events.some((e) => e.text.includes('has what they hoped for'))).toBe(true);
    expect((p.mood?.thoughts ?? []).some((t) => t.kind === 'goal' && t.value > 0)).toBe(true);
    expect(goalNudge(w, p, opt('socialize', 'household'))).toBe(0);
  });
});

describe('an injury', () => {
  it('slows walking and work in proportion to how far it is from healed, and heals with time', () => {
    const w = world('rich');
    const p = adult(w);
    const speed0 = moveSpeed(w, p);
    const work0 = taskMultiplier(w, p, 'build');
    expect(injure(w, p, 'sprain', 'felling a tree')).toBe(true);
    expect(injure(w, p, 'cut', 'again')).toBe(false);
    expect(injuryFactor(w, p)).toBeCloseTo(0.6, 5);
    expect(moveSpeed(w, p)).toBeLessThan(speed0 * 0.75);
    expect(taskMultiplier(w, p, 'build')).toBeGreaterThan(work0 * 1.4);
    w.tick = p.injury!.until;
    expect(injuryFactor(w, p)).toBe(1);
    lifeTickRich(w, p);
    expect(p.injury).toBeUndefined();
    expect(w.events.some((e) => e.text.includes('has healed'))).toBe(true);
  });

  it('comes as a hashed chance at risky work, and never in an authored world', () => {
    const r = world('rich');
    const p = adult(r);
    p.needs.energy = 90;
    let hurtAt = -1;
    for (let i = 0; i < 4000 && hurtAt < 0; i++) {
      r.tick++;
      riskOfHarm(r, p, 'tree', 0.004);
      if (p.injury) hurtAt = r.tick;
    }
    expect(hurtAt).toBeGreaterThan(0);
    expect(p.injury!.how).toBe('felling a tree');
    const a = world('authored');
    const q = adult(a);
    for (let i = 0; i < 4000; i++) {
      a.tick++;
      riskOfHarm(a, q, 'tree', 1);
    }
    expect(q.injury).toBeUndefined();
    expect(injure(a, q, 'cut', 'x')).toBe(false);
  });
});

describe('age', () => {
  it('tells on an elder in a rich world only: less carried, slower mending', () => {
    const r = world('rich');
    const a = world('authored');
    const pr = adult(r);
    const pa = adult(a);
    const capAdult = carryCap(r, pr);
    pr.birthTick = r.tick - (AGE_ELDER + 1) * TICKS_PER_YEAR;
    pa.birthTick = a.tick - (AGE_ELDER + 1) * TICKS_PER_YEAR;
    expect(stageOf(r, pr)).toBe('elder');
    expect(carryCap(r, pr)).toBeLessThan(carryCap(a, pa));
    expect(carryCap(r, pr)).toBeLessThan(capAdult);
  });

  it('an authored world runs a day with none of this', () => {
    const a = world('authored');
    for (let i = 0; i < DAY; i++) stepWorld(a);
    expect(a.persons.every((p) => p.goal === undefined && p.injury === undefined)).toBe(true);
  });
});
