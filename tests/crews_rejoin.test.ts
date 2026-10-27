import { expect, it } from 'vitest';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { crewsTick } from '../src/sim/crews';
import type { Relation } from '../src/sim/types';

function rel(affinity: number): Relation {
  return { affinity, trust: 10, familiarity: 10, lastMet: 0, kin: '', avoidUntil: 0, debt: 0, history: [], grievance: null, settledAt: -99999 };
}

function make() {
  const w = createWorld(currentWorldSettings('normal', 'river', { immigration: false }));
  const adults = w.persons.filter((q) => q.alive && q.children !== undefined).slice(0, 4);
  const [p, x, y, z] = adults;
  for (const a of adults) for (const b of adults) if (a !== b) a.relations[b.id] = rel(40);
  w.crews = [{ id: 1, name: `${p.name}'s crew`, members: [p.id, x.id, y.id, z.id], since: w.tick, together: w.tick }];
  p.relations[x.id].grievance = { cause: 'refusal', detail: 'would not help', since: w.tick, weight: 50, apologies: 0, lastAmends: 0 };
  return { w, p, x };
}

it('a member who left over a grievance is not readmitted while the grievance persists (rules 35)', () => {
  const { w, p } = make();
  w.tick = 617;
  crewsTick(w);
  const crew = w.crews![0];
  expect(crew.members.includes(p.id)).toBe(false);
});

it('still permits re-entry once the grievance is gone', () => {
  const { w, p, x } = make();
  p.relations[x.id].grievance = null;
  w.tick = 617;
  crewsTick(w);
  const crew = w.crews![0];
  expect(crew.members.includes(p.id)).toBe(true);
});

it('changes nothing below rules 35', () => {
  const w = createWorld({ ...currentWorldSettings('normal', 'river', { immigration: false }), rulesVersion: 34 });
  const adults = w.persons.filter((q) => q.alive && q.children !== undefined).slice(0, 4);
  const [p, x, y, z] = adults;
  for (const a of adults) for (const b of adults) if (a !== b) a.relations[b.id] = rel(40);
  w.crews = [{ id: 1, name: `${p.name}'s crew`, members: [p.id, x.id, y.id, z.id], since: w.tick, together: w.tick }];
  p.relations[x.id].grievance = { cause: 'refusal', detail: 'would not help', since: w.tick, weight: 50, apologies: 0, lastAmends: 0 };
  w.tick = 617;
  crewsTick(w);
  expect(w.crews![0].members.includes(p.id)).toBe(true); // old behaviour: re-admitted despite the grievance
});
