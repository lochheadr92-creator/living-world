// OBSERVER PURITY, one case `tests/purity.test.ts` cannot reach: a life change that has run its course.
//
// `lifeEventOf` (lifechanges.ts) lets an expired change lapse by deleting it, and the person card used it to read the change. So
// opening the card of someone whose change had just expired removed it from saved state, and a world that had been looked at no
// longer matched the same world nobody had looked at. Harmless to what anyone does, since the simulation lets it lapse itself the
// next time it asks, but it is a write from an observer.
//
// The shortest change lasts four days (9,600 ticks) and `purity.test.ts` runs 5,000, so no change ever expired during that test.
// This one stages the expiry. The scene is STAGED; it steps the real world and asks the real inspector.
import { describe, expect, it } from 'vitest';
import { serializeWorld } from '../src/app/save';
import { createWorld } from '../src/sim/factory';
import { describePerson } from '../src/sim/inspect';
import { leanOn, lifeEventOf } from '../src/sim/lifechanges';
import { currentWorldSettings } from '../src/sim/profiles';
import { hashWorld } from '../src/sim/world';
import { deepHash } from './helpers/golden';
import { run } from './helpers/util';

function expiredScene() {
  const w = createWorld(currentWorldSettings('normal', 'purity-life', { immigration: false }));
  run(w, 200);
  const [p, other] = w.persons.filter((q) => q.alive);
  // a change that ended one tick ago
  p.lifeEvent = { kind: 'moved', about: 0, since: w.tick - 9600, until: w.tick - 1 };
  return { w, p, other };
}

describe('asking about a life change that has run its course', () => {
  it('says there is none, and deletes nothing from the person or the world', () => {
    const { w, p } = expiredScene();
    const person = JSON.stringify(p);
    const saved = serializeWorld(w);
    const hash = hashWorld(w);
    const deep = deepHash(w);
    const card = describePerson(w, p.id, { opportunities: true });
    expect(card).not.toBeNull();
    expect(card!.lifeEvent, 'the card does not describe a change that is over').toBeNull();
    // booleans, not string equality: a failed string comparison would print the whole serialized person
    expect(p.lifeEvent, 'the expired record is still there for the simulation to lapse').toBeDefined();
    expect(JSON.stringify(p) === person, 'the person is exactly as they were').toBe(true);
    expect(serializeWorld(w) === saved, 'saved state is exactly as it was').toBe(true);
    expect(hashWorld(w)).toBe(hash);
    expect(deepHash(w)).toBe(deep);
  });

  it('still lapses when the SIMULATION asks: behaviour is unchanged', () => {
    const { w, p, other } = expiredScene();
    expect(leanOn(w, other, p), 'an expired change leans on nobody').toBe(0);
    expect(p.lifeEvent, 'the simulation, asking, lets it lapse').toBeUndefined();
    expect(lifeEventOf(w, p)).toBeNull();
  });

  it('describes a change that is still running, and leaves it alone', () => {
    const { w, p } = expiredScene();
    p.lifeEvent = { kind: 'moved', about: 0, since: w.tick, until: w.tick + 5000 };
    const person = JSON.stringify(p);
    const card = describePerson(w, p.id);
    expect(card!.lifeEvent).toMatch(/moved households/);
    expect(JSON.stringify(p) === person, 'a running change is left alone').toBe(true);
  });
});
