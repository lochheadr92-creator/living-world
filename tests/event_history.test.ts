import { describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { DAY } from '../src/sim/constants';
import { crewOf, crewsTick } from '../src/sim/crews';
import { addEvent } from '../src/sim/events';
import { createWorld } from '../src/sim/factory';
import { stageOf } from '../src/sim/people';
import { currentWorldSettings } from '../src/sim/profiles';
import { pickStory } from '../src/sim/traditions';
import type { Person } from '../src/sim/types';

const make = () => createWorld(currentWorldSettings('normal', 'meadow', { immigration: false }));
function friends(a: Person, b: Person): void {
  for (const [p, q] of [[a, b], [b, a]]) {
    p.relations[q.id] = { affinity: 40, trust: 0, familiarity: 0, lastMet: 0, kin: '', avoidUntil: 0, debt: 0, history: [], grievance: null, settledAt: 0 };
  }
}

describe('historical event participants', () => {
  it('snapshots the caller list in the feed and chronicle, so a later join cannot change story eligibility', () => {
    const w = make();
    w.events = []; w.chronicle = [];
    const ids = [w.persons[0].id, w.persons[1].id];
    const listener = w.persons[2].id, speaker = w.persons[3].id;
    addEvent(w, 'social', 'Two people have become a crew.', ids);
    ids.push(listener);
    expect(w.events[0].ids).toEqual(ids.slice(0, 2));
    expect(w.chronicle![0].ids).toEqual(ids.slice(0, 2));
    w.tick = 3 * DAY + 1;
    expect(pickStory(w, speaker, listener)?.about).toBe(ids[0]);
  });

  it('forms a real crew, saves, loads and admits a later member without changing its formation history', () => {
    const w = make();
    for (const p of w.persons) p.relations = {};
    const [a, b, c, d] = w.persons.filter(p => stageOf(w, p) === 'adult');
    friends(a, b); friends(a, c); friends(b, c);
    w.tick = 17;
    crewsTick(w);
    const crew = crewOf(w, a)!;
    expect(crew.members).toEqual([a.id, b.id, c.id]);
    const event = w.events.find(e => e.text.includes('have become a crew'))!;
    const originalIds = [...event.ids];
    const loaded = deserializeWorld(serializeWorld(w));
    for (const world of [w, loaded]) {
      const byId = (id: number) => world.persons.find(p => p.id === id)!;
      friends(byId(d.id), byId(a.id)); friends(byId(d.id), byId(b.id));
      world.tick += DAY / 4;
      crewsTick(world);
      expect(crewOf(world, byId(a.id))!.members).toContain(d.id);
      expect(world.events.find(e => e.id === event.id)!.ids).toEqual(originalIds);
      expect(world.chronicle!.find(e => e.id === event.id)!.ids).toEqual(originalIds);
    }
    expect(serializeWorld(loaded)).toBe(serializeWorld(w));
  });

  for (const rulesVersion of [undefined, 1, 27, 28]) {
    it(`retains the recorded alias semantics for historical rules ${rulesVersion ?? 'unversioned'}`, () => {
      const w = createWorld({ ...currentWorldSettings('normal', 'meadow'), rulesVersion });
      const ids = [w.persons[0].id];
      addEvent(w, 'life', 'Historical event.', ids);
      const event = w.events.at(-1)!;
      ids.push(w.persons[1].id);
      expect(event.ids).toBe(ids);
      expect(w.chronicle!.at(-1)!.ids).toBe(ids);
    });
  }
});
