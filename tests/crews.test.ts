// Friend groups and informal crews (src/sim/crews.ts): mutual friends become a crew, a friend of most of them joins, the crew
// pulls its members toward each other's work and company, and it drifts apart as liking goes or a quarrel comes; an authored
// world has none.
import { describe, expect, it } from 'vitest';
import { DAY } from '../src/sim/constants';
import { createWorld } from '../src/sim/factory';
import { CREW_NUDGE, crewNudge, crewOf, crewsOf, crewsTick } from '../src/sim/crews';
import { stageOf } from '../src/sim/people';
import { settingsForProfile } from '../src/sim/profiles';
import { stepWorld } from '../src/sim/world';
import type { Option } from '../src/sim/optutil';
import type { Person, World } from '../src/sim/types';

const world = (dynamics: 'authored' | 'rich'): World => createWorld(settingsForProfile('normal', 'meadow', { immigration: false, dynamics }));
const blank = { affinity: 0, trust: 0, familiarity: 0, lastMet: 0, kin: '' as const, avoidUntil: 0, debt: 0, history: [], grievance: null, settledAt: 0 };
const befriend = (a: Person, b: Person, aff = 40): void => {
  a.relations[b.id] = { ...(a.relations[b.id] ?? blank), affinity: aff, grievance: null };
  b.relations[a.id] = { ...(b.relations[a.id] ?? blank), affinity: aff, grievance: null };
};
const tickAt = (w: World): void => {
  while (w.tick % (DAY / 4) !== 17) w.tick++;
  crewsTick(w);
};

describe('crews', () => {
  it('form among mutual friends, pull members toward each other, and drift apart; never in an authored world', () => {
    const w = world('rich');
    for (let i = 0; i < 100; i++) stepWorld(w);
    const [a, b, c, d] = w.persons.filter((p) => p.alive && stageOf(w, p) === 'adult');
    for (const p of w.persons) for (const q of w.persons) if (p !== q && p.relations[q.id]) p.relations[q.id].affinity = Math.min(p.relations[q.id].affinity, 20);
    befriend(a, b);
    befriend(a, c);
    befriend(b, c);
    tickAt(w);
    const crew = crewOf(w, a);
    expect(crew).toBeTruthy();
    expect(crew!.members.sort()).toEqual([a.id, b.id, c.id].sort());
    expect(w.events.some((e) => e.text.includes('have become a crew'))).toBe(true);
    // a friend of two of them joins
    befriend(d, a);
    befriend(d, b);
    tickAt(w);
    expect(crew!.members).toContain(d.id);
    // the pull: a crew-mate at work on the same thing, and company
    b.activity = { kind: 'gather', targetId: 4242 } as any;
    const opt = (kind: Option['kind'], targetId: number): Option => ({ kind, label: '', goal: '', need: null, util: 10, parts: [], eta: 0, key: 'k', targetId });
    expect(crewNudge(w, a, opt('gather', 4242))).toBe(CREW_NUDGE);
    expect(crewNudge(w, a, opt('gather', 1))).toBe(0);
    expect(crewNudge(w, a, opt('socialize', b.id))).toBe(CREW_NUDGE);
    b.activity = null;
    // a quarrel: c holds a grievance against a and leaves
    c.relations[a.id].grievance = { cause: 'competition', detail: 'x', since: w.tick, weight: 30, apologies: 0, lastAmends: 0 };
    tickAt(w);
    expect(crew!.members).not.toContain(c.id);
    expect(w.events.some((e) => e.text.includes('fell out with'))).toBe(true);
    const au = world('authored');
    const [x, y, z] = au.persons;
    befriend(x, y);
    befriend(x, z);
    befriend(y, z);
    for (let i = 0; i < DAY / 2; i++) stepWorld(au);
    expect(au.crews).toBeUndefined();
    expect(crewsOf(au)).toEqual([]);
  });
});
