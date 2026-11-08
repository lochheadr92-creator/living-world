// Rules 168: a laid-up adult asks a neighbour to watch a child only when that neighbour has seen
// the child or been told where they are (src/sim/known_handover.ts). The same staged household
// is asked at 167, where any nearby adult is eligible, and at 168, where a stranger is not.
import { afterEach, describe, expect, it } from 'vitest';
import { createWorld } from '../src/sim/factory';
import { generateOptions } from '../src/sim/decision';
import { DAY } from '../src/sim/constants';
import { setKnownHandover } from '../src/sim/known_handover';
import { stageOf } from '../src/sim/people';
import { settingsForProfile } from '../src/sim/profiles';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { stepWorld } from '../src/sim/world';
import type { Person, SeenEntity, World } from '../src/sim/types';

afterEach(() => { setKnownHandover(true); });

const blank = { affinity: 0, trust: 0, familiarity: 0, lastMet: 0, kin: '' as const, avoidUntil: 0, debt: 0, history: [], grievance: null, settledAt: 0 };

function scene(version: number) {
  const w = createWorld(settingsForProfile('normal', 'meadow', { immigration: false, dynamics: 'rich' }));
  w.settings.rulesVersion = version;
  for (let i = 0; i < 100; i++) stepWorld(w);
  const child = w.persons.find((p) => p.alive && stageOf(w, p) === 'child')!;
  const parent = w.persons.find((p) => p.alive && p.hhId === child.hhId && stageOf(w, p) === 'adult')!;
  for (const q of w.persons) if (q !== parent && q.hhId === child.hhId && stageOf(w, q) !== 'child') q.injury = { kind: 'sprain', since: w.tick, until: w.tick + DAY, how: 'x' };
  parent.injury = { kind: 'broken', since: w.tick, until: w.tick + 3 * DAY, how: 'at the building site' };
  const neighbour = w.persons.find((p) => p.alive && p.hhId !== child.hhId && stageOf(w, p) === 'adult' && !p.injury)!;
  neighbour.x = parent.x + 2;
  neighbour.y = parent.y;
  neighbour.traits.generosity = 0.9;
  neighbour.relations[parent.id] = { ...(neighbour.relations[parent.id] ?? blank), affinity: 20, trust: 20 };
  parent.relations[neighbour.id] = { ...(parent.relations[neighbour.id] ?? blank), affinity: 20, trust: 20 };
  for (const p of [parent, neighbour]) { p.needs.hunger = p.needs.thirst = p.needs.energy = p.needs.warmth = 90; }
  parent.seen = [{ id: neighbour.id, ent: 'person', x: neighbour.x, y: neighbour.y, hungry: false, thirsty: false, tired: false, cold: false, hurt: false, child: false, carrying: [], asleep: false, act: '', busyTalking: false }];
  neighbour.seen = neighbour.seen.filter((s) => s.ent !== 'person' || !w.persons.some((c) => c.id === s.id && c.hhId === child.hhId && stageOf(w, c) === 'child'));
  for (const c of w.persons) if (c.hhId === child.hhId && stageOf(w, c) === 'child') delete neighbour.whereabouts[c.id];
  return { w, parent, child, neighbour };
}

function glance(q: Person, child: Person) {
  const seen: SeenEntity = {
    id: child.id, ent: 'person', x: child.x, y: child.y,
    hungry: false, thirsty: false, tired: false, cold: false, hurt: false,
    child: true, carrying: [], asleep: false, act: '', busyTalking: false,
  };
  q.seen.push(seen);
}

function childrenOf(w: World, hhId: number): Person[] {
  return w.persons.filter((p) => p.alive && p.hhId === hhId && stageOf(w, p) === 'child');
}

function asks(w: World, parent: Person) {
  return generateOptions(w, parent, true).options.filter((o) => o.kind === 'socialize' && o.label.includes('keep an eye on'));
}

function blocked(w: World, parent: Person) {
  return generateOptions(w, parent, true).blocked.filter((o) => o.label.includes('keep an eye on'));
}

describe('rules 168: a watch is asked only of a neighbour who knows the child', () => {
  it('is registered and supported (the current version may be later)', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(168);
    expect(SUPPORTED_RULES_VERSIONS).toContain(168);
  });

  it('at 167 still asks a neighbour who has never seen the child', () => {
    const { w, parent } = scene(167);
    expect(asks(w, parent).length).toBeGreaterThan(0);
  });

  it('at 168 does not ask that stranger, and the inspector says why', () => {
    const { w, parent, neighbour } = scene(168);
    expect(asks(w, parent)).toEqual([]);
    const why = blocked(w, parent);
    expect(why.some((o) => o.targetId === neighbour.id && /^has not seen .+ and has not been told where they are$/.test(o.blocked ?? ''))).toBe(true);
  });

  it('at 168 asks once the neighbour has seen the child', () => {
    const { w, parent, neighbour, child } = scene(168);
    for (const c of childrenOf(w, child.hhId)) glance(neighbour, c);
    expect(asks(w, parent).length).toBeGreaterThan(0);
  });

  it('at 168 asks once the neighbour has been told where the child is', () => {
    const { w, parent, neighbour, child } = scene(168);
    for (const c of childrenOf(w, child.hhId)) neighbour.whereabouts[c.id] = { x: c.x, y: c.y, tick: w.tick };
    expect(asks(w, parent).length).toBeGreaterThan(0);
  });

  it('at 168 kin alone does not qualify', () => {
    const { w, parent, neighbour, child } = scene(168);
    for (const c of childrenOf(w, child.hhId)) neighbour.relations[c.id] = { ...(neighbour.relations[c.id] ?? blank), kin: 'parent' };
    expect(asks(w, parent)).toEqual([]);
  });

  it('the lab switch restores the old ask inside a rules-168 rich world', () => {
    const { w, parent } = scene(168);
    setKnownHandover(false);
    expect(asks(w, parent).length).toBeGreaterThan(0);
  });
});
