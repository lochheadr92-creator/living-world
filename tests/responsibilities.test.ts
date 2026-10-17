// Shared responsibilities (src/sim/responsibilities.ts): someone laid up asks a neighbour to keep an eye on a child or keep the
// fire; the neighbour may promise or decline; a promise is kept by staying with the child or feeding the fire; a refusal
// leaves the asker to decide. Nothing of it in an authored world.
import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/sim/factory';
import { generateOptions } from '../src/sim/decision';
import { startActivity } from '../src/sim/activities';
import { createBuilding } from '../src/sim/buildings';
import { DAY } from '../src/sim/constants';
import { stageOf } from '../src/sim/people';
import { settingsForProfile } from '../src/sim/profiles';
import { childrenNeedingWatch, laidUp } from '../src/sim/responsibilities';
import { createRequest, evaluateRequest } from '../src/sim/social';
import { stepWorld } from '../src/sim/world';
import type { Person, World } from '../src/sim/types';

const world = (dynamics: 'authored' | 'rich'): World => createWorld(settingsForProfile('normal', 'meadow', { immigration: false, dynamics }));
const fed = (p: Person): void => {
  p.needs.hunger = p.needs.thirst = p.needs.energy = p.needs.warmth = 90;
};

function parentWithChild(w: World): { parent: Person; child: Person; neighbour: Person } {
  const child = w.persons.find((p) => p.alive && stageOf(w, p) === 'child')!;
  const parent = w.persons.find((p) => p.alive && p.hhId === child.hhId && stageOf(w, p) === 'adult')!;
  // the other adults of the household are laid up too
  for (const q of w.persons) if (q !== parent && q.hhId === child.hhId && stageOf(w, q) !== 'child') q.injury = { kind: 'sprain', since: w.tick, until: w.tick + DAY, how: 'x' };
  parent.injury = { kind: 'broken', since: w.tick, until: w.tick + 3 * DAY, how: 'at the building site' };
  const neighbour = w.persons.find((p) => p.alive && p.hhId !== child.hhId && stageOf(w, p) === 'adult' && !p.injury)!;
  neighbour.x = parent.x + 2;
  neighbour.y = parent.y;
  neighbour.traits.generosity = 0.9;
  const blank = { affinity: 0, trust: 0, familiarity: 0, lastMet: 0, kin: '' as const, avoidUntil: 0, debt: 0, history: [], grievance: null, settledAt: 0 };
  neighbour.relations[parent.id] = { ...(neighbour.relations[parent.id] ?? blank), affinity: 20, trust: 20 };
  parent.relations[neighbour.id] = { ...(parent.relations[neighbour.id] ?? blank), affinity: 20, trust: 20 };
  fed(neighbour);
  fed(parent);
  return { parent, child, neighbour };
}

describe('asking a neighbour to keep an eye on a child', () => {
  it('is offered to a laid-up parent with no able adult at home, in a rich world only', () => {
    const r = world('rich');
    for (let i = 0; i < 100; i++) stepWorld(r);
    const { parent, child, neighbour } = parentWithChild(r);
    expect(laidUp(r, parent)).toBe(true);
    expect(childrenNeedingWatch(r, parent).map((c) => c.id)).toContain(child.id);
    parent.seen = [{ id: neighbour.id, ent: 'person', x: neighbour.x, y: neighbour.y, hungry: false, thirsty: false, tired: false, cold: false, hurt: false, child: false, carrying: [], asleep: false, act: '', busyTalking: false }];
    const ctx = generateOptions(r, parent, true);
    expect(ctx.options.some((o) => o.kind === 'socialize' && o.label.startsWith('Ask ') && o.label.includes('keep an eye on'))).toBe(true);
    const a = world('authored');
    for (let i = 0; i < 100; i++) stepWorld(a);
    const s = parentWithChild(a);
    expect(laidUp(a, s.parent)).toBe(false);
    expect(childrenNeedingWatch(a, s.parent)).toEqual([]);
  });

  it('is answered by the neighbour\'s own circumstances, and a promise is kept by staying with the child', () => {
    const r = world('rich');
    for (let i = 0; i < 100; i++) stepWorld(r);
    const { parent, child, neighbour } = parentWithChild(r);
    const req = createRequest(r, parent, neighbour, { kind: 'watch', destKind: 'person', destId: child.id, purpose: 'keep an eye' });
    expect(evaluateRequest(r, neighbour, parent, req).kind).toBe('promise');
    // a neighbour with two children of their own, or laid up, declines
    const busy = r.persons.find((p) => p.alive && p.hhId !== child.hhId && p !== neighbour && stageOf(r, p) === 'adult')!;
    fed(busy);
    busy.illness = { since: r.tick, severity: 0.9, rested: 0, course: DAY, how: '' };
    expect(evaluateRequest(r, busy, parent, createRequest(r, parent, busy, { kind: 'watch', destKind: 'person', destId: child.id })).kind).toBe('decline');
    // the promise, kept
    neighbour.commitments.push({ id: r.nextId++, requestId: req.id, kind: 'work', to: parent.id, item: null, amount: 1, siteId: 0, made: r.tick, deadline: r.tick + DAY, status: 'active', destKind: 'person', destId: child.id, milestone: 'watched', contrib: 0 });
    const c = neighbour.commitments.at(-1)!;
    neighbour.whereabouts[child.id] = { x: child.x, y: child.y, tick: r.tick };
    const ctx = generateOptions(r, neighbour, true);
    const opt = ctx.options.find((o) => o.kind === 'visit' && o.label.includes('Keep an eye on'));
    expect(opt).toBeTruthy();
    const act = opt!.make!()!;
    startActivity(r, neighbour, act);
    for (let i = 0; i < 1500 && c.status === 'active'; i++) {
      child.x = neighbour.x;
      child.y = neighbour.y + 1;
      fed(neighbour);
      stepWorld(r);
    }
    expect(c.status).toBe('done');
    expect(neighbour.log.some((l) => l.text.includes('as promised'))).toBe(true);
  });
});

describe('keeping the fire', () => {
  it('a promise to keep it going is kept by feeding it', () => {
    const r = world('rich');
    for (let i = 0; i < 100; i++) stepWorld(r);
    const p = r.persons.find((x) => x.alive && stageOf(r, x) === 'adult')!;
    fed(p);
    const fire = r.buildings.find((b) => b.type === 'fire') ?? createBuilding(r, 'fire', Math.floor(p.x) + 2, Math.floor(p.y), 0, { fuel: 100 });
    fire.fuel = 100;
    p.inv.wood = 3;
    p.commitments.push({ id: r.nextId++, requestId: 0, kind: 'work', to: r.persons[1].id, item: null, amount: 1, siteId: 0, made: r.tick, deadline: r.tick + DAY, status: 'active', destKind: 'building', destId: fire.id, milestone: 'fire kept', contrib: 0 });
    const c = p.commitments.at(-1)!;
    p.beliefs[fire.id] = { id: fire.id, kind: 'building', x: fire.x, y: fire.y, amount: 0, max: 0, seen: r.tick, src: 'seen', from: p.id, learned: r.tick, btype: 'fire', fuel: 100 };
    p.bykind.building = [...(p.bykind.building ?? []), fire.id];
    const ctx = generateOptions(r, p, true);
    const opt = ctx.options.find((o) => o.kind === 'fuel_fire' && o.targetId === fire.id);
    expect(opt).toBeTruthy();
    expect(opt!.parts.some(([n]) => n === 'promised to keep it going')).toBe(true);
    const act = opt!.make!()!;
    startActivity(r, p, act);
    for (let i = 0; i < 600 && c.status === 'active'; i++) stepWorld(r);
    expect(c.status).toBe('done');
  });
});
