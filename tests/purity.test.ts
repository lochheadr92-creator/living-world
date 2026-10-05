import { describe, expect, it } from 'vitest';
import { serializeWorld } from '../src/app/save';
import { ALL_ITEMS } from '../src/sim/constants';
import { describeEntity, describeEntityName, describePerson, summarizeWorld } from '../src/sim/inspect';
import { whereItemIs } from '../src/sim/inspect_work';
import type { World } from '../src/sim/types';
import { hashWorld } from '../src/sim/world';
import { expectSameWorld } from './helpers/resume';
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

  it('a harsh world with a death in it: the grave and its record, the wolves, the dead person’s memorial are described without a change', () => {
    const w = natural('heath', { harsh: true });
    run(w, 16000);
    expect(w.graves.length, 'somebody has died by now').toBeGreaterThan(0);
    const before = { hash: hashWorld(w), json: serializeWorld(w) };
    const n = describeEverything(w);
    expect(n.things).toBeGreaterThan(100);
    expect(hashWorld(w)).toBe(before.hash);
    expect(serializeWorld(w)).toBe(before.json);
  }, 240_000);
});
