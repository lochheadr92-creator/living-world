// Rules 171: whereIs no longer treats the target's live household id as the searcher's knowledge of their home.
import { afterEach, describe, expect, it } from 'vitest';
import { setKnownHome } from '../src/sim/known_home';
import { whereIs } from '../src/sim/optutil';
import type { Ctx } from '../src/sim/optutil';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import type { Belief, Person, World } from '../src/sim/types';
import { addPerson, done, stage } from './helpers/kit';

afterEach(() => { setKnownHome(true); });

function scene(version: number, dynamics: 'rich' | 'authored' = 'rich') {
  const s = stage(`known-home-${version}-${dynamics}`);
  s.w.settings.dynamics = dynamics;
  s.w.settings.rulesVersion = version;
  const ada = addPerson(s, 'Ada', 10, 10, { age: 30 });
  const ben = addPerson(s, 'Ben', 40, 40, { age: 8 });
  done(s);
  return { w: s.w, ada, ben };
}

function belief(id: number, hh: number, x: number, y: number, btype: 'hut' | 'storehouse' = 'hut'): Belief {
  return { id, kind: 'building', hh, x, y, btype } as Belief;
}

function look(w: World, ada: Person, benId: number, siteId = 0) {
  return whereIs({ world: w, p: ada, seenPersons: [] } as unknown as Ctx, benId, siteId);
}

describe('rules 171: a home is what was told, or the searcher own household', () => {
  it('is registered and supported (the current version may be later)', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(171);
    expect(SUPPORTED_RULES_VERSIONS).toContain(171);
  });

  it('at 170 a stranger follows the target live household id, and at 171 that match is not a home', () => {
    const old = scene(170);
    const next = scene(171);
    for (const { w, ada, ben } of [old, next]) {
      ada.beliefs[7] = belief(7, ben.hhId, 3, 4);
    }
    expect(look(old.w, old.ada, old.ben.id)).toEqual({ x: 3, y: 4, how: 'at their home' });
    expect(look(next.w, next.ada, next.ben.id)).toBeNull();
    next.ben.hhId = 99;
    expect(look(next.w, next.ada, next.ben.id)).toBeNull();
  });

  it('a room that names a believed home is that home, and changing the live household id does not move it', () => {
    const { w, ada, ben } = scene(171);
    ada.beliefs[7] = belief(7, 50, 3, 4);
    ada.whereabouts[ben.id] = { x: 1, y: 1, tick: w.tick - 1000, room: { homeId: 7, name: 'the hut', hungry: false, thirsty: false, needsCare: false, household: false } };
    expect(look(w, ada, ben.id)).toEqual({ x: 3, y: 4, how: 'at their home' });
    ben.hhId = 99;
    ada.beliefs[7] = belief(7, 77, 3, 4);
    expect(look(w, ada, ben.id)).toEqual({ x: 3, y: 4, how: 'at their home' });
  });

  it('an own child is looked for at the searcher own household home, not the child live household', () => {
    const { w, ada, ben } = scene(171);
    ada.children = [ben.id];
    ada.beliefs[8] = belief(8, ada.hhId, 6, 8);
    ada.beliefs[7] = belief(7, ben.hhId, 3, 4);
    expect(look(w, ada, ben.id)).toEqual({ x: 6, y: 8, how: 'at their home' });
    ben.hhId = 99;
    expect(look(w, ada, ben.id)).toEqual({ x: 6, y: 8, how: 'at their home' });
  });

  it('a told building site is used even when the person is off the register', () => {
    const { w, ada, ben } = scene(171);
    ada.beliefs[9] = { id: 9, kind: 'site', x: 11, y: 12 } as Belief;
    w.byId.delete(ben.id);
    expect(look(w, ada, ben.id, 9)).toEqual({ x: 11, y: 12, how: 'at their building site' });
    const old = scene(170);
    old.ada.beliefs[9] = { id: 9, kind: 'site', x: 11, y: 12 } as Belief;
    old.w.byId.delete(old.ben.id);
    expect(look(old.w, old.ada, old.ben.id, 9)).toBeNull();
  });

  it('the switch and an authored world keep the live household match', () => {
    const off = scene(171);
    setKnownHome(false);
    off.ada.beliefs[7] = belief(7, off.ben.hhId, 3, 4);
    expect(look(off.w, off.ada, off.ben.id)).toEqual({ x: 3, y: 4, how: 'at their home' });
    const authored = scene(171, 'authored');
    authored.ada.beliefs[7] = belief(7, authored.ben.hhId, 3, 4);
    expect(look(authored.w, authored.ada, authored.ben.id)).toEqual({ x: 3, y: 4, how: 'at their home' });
  });
});
