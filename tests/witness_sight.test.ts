// Rules 183: a witness has to be able to see (same space as the actor, within their own sense radius).
import { afterEach, describe, expect, it } from 'vitest';
import { onTheft } from '../src/sim/misdeeds';
import { noteDeedNear } from '../src/sim/reputation';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { witness } from '../src/sim/social';
import { setWitnessSight } from '../src/sim/witness_sight';
import { addPerson, building, done, stage } from './helpers/kit';

afterEach(() => { setWitnessSight(true); });

/** Tom steals from Olly's store; Wen is a bystander `gap` tiles from the store, awake. */
function scene(version: number, gap: number, dynamics: 'rich' | 'authored' = 'rich') {
  const s = stage(`witness-sight-${version}-${gap}-${dynamics}`);
  s.w.settings.dynamics = dynamics;
  s.w.settings.rulesVersion = version;
  const olly = addPerson(s, 'Olly', 30, 30, { age: 40 });
  const store = building(s, 'hut', 40, 40, olly.hhId, { grain: 5 });
  const tom = addPerson(s, 'Tom', 41, 42, { age: 30 });
  const wen = addPerson(s, 'Wen', 40 + store.w / 2 + gap, 40 + store.h / 2, { age: 30 });
  const w = done(s);
  return { w, olly, store, tom, wen };
}

const sawSteal = (p: { relations: Record<number, { history: { text: string }[] }> }, id: number) => (p.relations[id]?.history ?? []).some((h) => h.text.startsWith('saw Tom steal'));
const heardAbout = (p: { heard?: { about: number }[] }, id: number) => (p.heard ?? []).some((r) => r.about === id);

describe('rules 183: a witness has to be able to see', () => {
  it('is registered and supported (the current version may be later)', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(183);
    expect(SUPPORTED_RULES_VERSIONS).toContain(183);
  });

  it('a theft seen from the yard in daylight is seen at both versions', () => {
    for (const version of [182, 183]) {
      const { w, store, tom, wen } = scene(version, 4);
      onTheft(w, tom, store, 2);
      expect(sawSteal(wen, tom.id)).toBe(true);
    }
  });

  it('a bystander indoors saw the yard theft at 182 and does not at 183', () => {
    const old = scene(182, 4);
    old.wen.indoors = 777;
    onTheft(old.w, old.tom, old.store, 2);
    expect(sawSteal(old.wen, old.tom.id)).toBe(true);
    const now = scene(183, 4);
    now.wen.indoors = 777;
    onTheft(now.w, now.tom, now.store, 2);
    expect(sawSteal(now.wen, now.tom.id)).toBe(false);
  });

  it('a bystander seven tiles off in the dark saw the theft at 182 and does not at 183', () => {
    const old = scene(182, 7);
    old.w.light = 0.1;
    onTheft(old.w, old.tom, old.store, 2);
    expect(sawSteal(old.wen, old.tom.id)).toBe(true);
    const now = scene(183, 7);
    now.w.light = 0.1;
    onTheft(now.w, now.tom, now.store, 2);
    expect(sawSteal(now.wen, now.tom.id)).toBe(false);
    const day = scene(183, 7);
    onTheft(day.w, day.tom, day.store, 2);
    expect(sawSteal(day.wen, day.tom.id)).toBe(true);
  });

  it('a gift is seen by someone in the same building and not by someone in another, at 183', () => {
    const { w, tom, olly, wen } = scene(183, 3);
    tom.indoors = 777;
    wen.indoors = 777;
    witness(w, 'gift', tom, olly, tom.x, tom.y);
    expect(wen.relations[tom.id]?.history.some((h) => h.text.startsWith('saw Tom help'))).toBe(true);
    const other = scene(183, 3);
    other.tom.indoors = 777;
    other.wen.indoors = 888;
    witness(other.w, 'gift', other.tom, other.olly, other.tom.x, other.tom.y);
    expect(other.wen.relations[other.tom.id]?.history.some((h) => h.text.startsWith('saw Tom help')) ?? false).toBe(false);
  });

  it('a birth indoors is news to those in the room and not to the yard at 183, and to both at 182', () => {
    const old = scene(182, 3);
    old.tom.indoors = 777;
    noteDeedNear(old.w, old.tom, 'news', 'Tom has had a child', old.tom.x, old.tom.y, 10);
    expect(heardAbout(old.wen, old.tom.id)).toBe(true);
    const now = scene(183, 3);
    now.tom.indoors = 777;
    noteDeedNear(now.w, now.tom, 'news', 'Tom has had a child', now.tom.x, now.tom.y, 10);
    expect(heardAbout(now.wen, now.tom.id)).toBe(false);
    const inRoom = scene(183, 3);
    inRoom.tom.indoors = 777;
    inRoom.wen.indoors = 777;
    noteDeedNear(inRoom.w, inRoom.tom, 'news', 'Tom has had a child', inRoom.tom.x, inRoom.tom.y, 10);
    expect(heardAbout(inRoom.wen, inRoom.tom.id)).toBe(true);
  });

  it('with the switch off the fixed radius stays at 183', () => {
    const { w, store, tom, wen } = scene(183, 4);
    setWitnessSight(false);
    wen.indoors = 777;
    onTheft(w, tom, store, 2);
    expect(sawSteal(wen, tom.id)).toBe(true);
  });

  it('an authored world has no theft witnesses at either rule', () => {
    const { w, store, tom, wen } = scene(183, 4, 'authored');
    onTheft(w, tom, store, 2);
    expect(sawSteal(wen, tom.id)).toBe(false);
  });
});
