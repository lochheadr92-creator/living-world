import { describe, expect, it } from 'vitest';
import { serializeWorld } from '../src/app/save';
import { ALL_ITEMS } from '../src/sim/constants';
import { describeEntity, describeEntityName, describePerson, summarizeWorld } from '../src/sim/inspect';
import { whereItemIs } from '../src/sim/inspect_work';
import { killPerson } from '../src/sim/lifecycle';
import { stageOf } from '../src/sim/people';
import type { World } from '../src/sim/types';
import { hashWorld } from '../src/sim/world';
import { expectSameWorld, firstDifference } from './helpers/resume';
import { natural, run } from './helpers/util';

/** Everything the interface can ask the world to describe, asked of every person and every thing in it. */
function describeEverything(w: World): { people: number; things: number } {
  let people = 0;
  let things = 0;
  for (const p of w.persons) {
    // the opportunities audit plans as the person would, so it is the likeliest to disturb something
    expect(describePerson(w, p.id, { opportunities: true })).not.toBeNull();
    describePerson(w, p.id);
    people++;
  }
  for (const [id, e] of w.byId) {
    describeEntityName(w, e);
    if (e.ent === 'person') continue;
    expect(describeEntity(w, id), `a card for ${e.ent} ${id}`).not.toBeNull();
    things++;
  }
  summarizeWorld(w);
  for (const k of ALL_ITEMS) whereItemIs(w, k);
  return { people, things };
}

describe('describing the world changes nothing in it', () => {
  it('an ordinary world: every person, building, site, plot, heap, source and wolf described; the world carries on exactly as one nobody looked at', () => {
    const watched = natural('meadow');
    const unwatched = natural('meadow');
    run(watched, 9000);
    run(unwatched, 9000);
    const before = { hash: hashWorld(watched), json: serializeWorld(watched) };
    const n = describeEverything(watched);
    expect(n.people).toBeGreaterThan(20);
    expect(n.things).toBeGreaterThan(100);
    expect(hashWorld(watched)).toBe(before.hash);
    expect(serializeWorld(watched)).toBe(before.json);
    // and the looking left no trace that shows later (a cache, a cooldown, a random number drawn)
    run(watched, 900);
    run(unwatched, 900);
    expectSameWorld(unwatched, watched);
  }, 240_000);

  it('asking what a person could do, over and over through the first days, leaves their promises, cooldowns and worries as they were', () => {
    // The first version of this check only looked once, at one moment: a promise that was being held up got its "held up at" time
    // rewritten by the planner the card asks, and no moment it happened to pick showed it. So: look at everybody, often, and compare
    // a world that is looked at with a twin that never is.
    const looked = natural('meadow');
    const twin = natural('meadow');
    let looks = 0;
    for (let t = 0; t < 5000; t += 250) {
      run(looked, 250);
      run(twin, 250);
      for (const p of looked.persons) {
        if (!p.alive) continue;
        const before = JSON.stringify(p);
        describePerson(looked, p.id, { opportunities: true });
        const after = JSON.stringify(p);
        if (after !== before) expect(firstDifference(JSON.parse(before), JSON.parse(after)), `asking about ${p.name} at tick ${looked.tick} changed them`).toBeNull();
        looks++;
      }
      const a = serializeWorld(looked);
      const b = serializeWorld(twin);
      if (a !== b) expect(firstDifference(JSON.parse(a), JSON.parse(b)), `the looked-at world has drifted from its twin by tick ${looked.tick}`).toBeNull();
    }
    expect(looks).toBeGreaterThan(400);
  }, 400_000);

  it('a harsh world with a death in it: the grave and its record, the wolves, the dead person’s memorial are described without a change', () => {
    // (a death is brought about rather than waited for: whether anyone dies in a given harsh world by a given day moves with every
    // change to how people are called; this test is about describing the dead, not about how people die)
    const w = natural('heath', { harsh: true });
    run(w, 9000);
    const victim = w.persons.filter((p) => p.alive && stageOf(w, p) === 'adult').sort((a, b) => a.id - b.id)[3];
    killPerson(w, victim, 'wolf attack');
    run(w, 1500);
    expect(w.graves.length, 'there is a grave').toBeGreaterThan(0);
    expect(w.deceased.length, 'and a record of who lies in it').toBeGreaterThan(0);
    const before = { hash: hashWorld(w), json: serializeWorld(w) };
    const n = describeEverything(w);
    expect(n.things).toBeGreaterThan(100);
    expect(hashWorld(w)).toBe(before.hash);
    expect(serializeWorld(w)).toBe(before.json);
  }, 240_000);
});
