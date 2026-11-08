// Rules 173: knownNeeds in sight reads the visible signs, not the dependant's live needs.
import { afterEach, describe, expect, it } from 'vitest';
import { knownNeeds } from '../src/sim/remembered_need';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { setSeenDependant } from '../src/sim/seen_dependant';
import type { SeenEntity } from '../src/sim/types';
import { addPerson, done, stage } from './helpers/kit';

afterEach(() => { setSeenDependant(true); });

function scene(version: number, dynamics: 'rich' | 'authored' = 'rich') {
  const s = stage(`seen-dependant-${version}-${dynamics}`);
  s.w.settings.dynamics = dynamics;
  s.w.settings.rulesVersion = version;
  const ada = addPerson(s, 'Ada', 10, 10, { age: 30 });
  const ben = addPerson(s, 'Ben', 12, 10, { age: 6 });
  done(s);
  ben.needs.hunger = 3;
  ben.needs.thirst = 4;
  ben.needs.warmth = 5;
  ada.seen = [{
    id: ben.id, ent: 'person', x: ben.x, y: ben.y,
    hungry: true, thirsty: true, tired: false, cold: true, hurt: false,
    starving: true, parched: false, child: true, carrying: [], asleep: false, act: '', busyTalking: false,
  } as SeenEntity];
  return { w: s.w, ada, ben };
}

describe('rules 173: a dependant in sight is what the signs show', () => {
  it('is registered and supported (the current version may be later)', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(173);
    expect(SUPPORTED_RULES_VERSIONS).toContain(173);
  });

  it('in sight at 173 follows the signs, and changing the live figure does not change it', () => {
    const { w, ada, ben } = scene(173);
    expect(knownNeeds(w, ada, ben, true)).toEqual({ hunger: 19, thirst: 39, warmth: 34 });
    ben.needs.hunger = 1;
    ben.needs.thirst = 2;
    ben.needs.warmth = 3;
    expect(knownNeeds(w, ada, ben, true)).toEqual({ hunger: 19, thirst: 39, warmth: 34 });
  });

  it('at 172, with the switch off, and in an authored world, in sight is still the live needs', () => {
    const old = scene(172);
    expect(knownNeeds(old.w, old.ada, old.ben, true)?.hunger).toBe(3);
    const off = scene(173);
    setSeenDependant(false);
    expect(knownNeeds(off.w, off.ada, off.ben, true)?.hunger).toBe(3);
    const authored = scene(173, 'authored');
    expect(knownNeeds(authored.w, authored.ada, authored.ben, true)?.hunger).toBe(3);
  });

  it('in sight with no sight record does not fall back to the live needs', () => {
    const { w, ada, ben } = scene(173);
    ada.seen = [];
    expect(knownNeeds(w, ada, ben, true)).toBeNull();
  });

  it('out of sight stays the remembered signs', () => {
    const { w, ada, ben } = scene(173);
    ada.whereabouts[ben.id] = { x: 1, y: 1, tick: w.tick, seen: { hungry: true, thirsty: false, cold: false } };
    ben.needs.hunger = 1;
    expect(knownNeeds(w, ada, ben, false)).toMatchObject({ hunger: 41, thirst: 100, warmth: 100, lookedAt: w.tick });
  });
});
