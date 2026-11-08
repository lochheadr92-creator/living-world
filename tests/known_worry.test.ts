// Rules 170: a worry about someone who has died is still walked until the worrier has learned the death
// (src/sim/known_worry.ts). The same staged worry is dropped at 169 and kept at 170.
import { afterEach, describe, expect, it } from 'vitest';
import { generateOptions } from '../src/sim/decision';
import { knowsDeath } from '../src/sim/death_knowledge';
import { killPerson } from '../src/sim/lifecycle';
import { setKnownWorry } from '../src/sim/known_worry';
import { perceive } from '../src/sim/perception';
import { rebuildMobileGrid } from '../src/sim/registry';
import { relOf } from '../src/sim/relations';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { noteConcerns, shareConcerns } from '../src/sim/welfare';
import { addPerson, done, pin, stage } from './helpers/kit';

afterEach(() => { setKnownWorry(true); });

function scene(version: number, dynamics: 'rich' | 'authored' = 'rich') {
  const s = stage(`known-worry-${version}-${dynamics}`);
  s.w.settings.dynamics = dynamics;
  s.w.settings.rulesVersion = version;
  const ada = addPerson(s, 'Ada', 40, 40, { age: 35, inv: { bread: 4, water: 2 }, hunger: 95, thirst: 95, energy: 95, traits: { generosity: 0.9 } });
  const ben = addPerson(s, 'Ben', 54, 40, { age: 30, hunger: 95, thirst: 95, energy: 95 });
  const cole = addPerson(s, 'Cole', 40, 42, { age: 34, hunger: 95, thirst: 95, energy: 95 });
  done(s);
  for (const p of [ada, ben, cole]) { pin(p); p.needs.warmth = 100; p.needs.safety = 100; }
  rebuildMobileGrid(s.w);
  perceive(s.w, ada);
  relOf(ada, ben.id).affinity = 30;
  relOf(cole, ben.id).affinity = 30;
  ada.whereabouts[ben.id] = { x: ben.x, y: ben.y, tick: s.w.tick };
  ada.concerns.push({ about: ben.id, kind: 'hungry', seen: s.w.tick, src: 'seen', from: ada.id, checked: -99999 });
  const id = ben.id;
  killPerson(s.w, ben, 'hunger');
  return { w: s.w, ada, cole, benId: id };
}

function visit(w: ReturnType<typeof scene>['w'], ada: ReturnType<typeof scene>['ada'], benId: number) {
  return generateOptions(w, ada, true, true).options.find((o) => o.key === `visit:${benId}`);
}

describe('rules 170: a worry about someone gone is kept until the death is known', () => {
  it('is registered and supported (the current version may be later)', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(170);
    expect(SUPPORTED_RULES_VERSIONS).toContain(170);
  });

  it('at 169 the visit is gone once the subject is off the register', () => {
    const { w, ada, benId } = scene(169);
    expect(knowsDeath(ada, benId)).toBe(false);
    noteConcerns(w, ada);
    expect(ada.concerns.some((c) => c.about === benId)).toBe(false);
    expect(visit(w, ada, benId)).toBeUndefined();
  });

  it('at 170 the visit is still offered, and the worry names the deceased person', () => {
    const { w, ada, benId } = scene(170);
    expect(knowsDeath(ada, benId)).toBe(false);
    expect(w.byId.get(benId)).toBeUndefined();
    noteConcerns(w, ada);
    expect(ada.concerns.some((c) => c.about === benId)).toBe(true);
    expect(visit(w, ada, benId)?.label).toBe('Bring bread to Ben');
    expect(knowsDeath(ada, benId)).toBe(false);
  });

  it('at 170 a known death drops the visit', () => {
    const { w, ada, benId } = scene(170);
    relOf(ada, benId).deathKnown = { learned: w.tick, source: 'told', via: 0 };
    noteConcerns(w, ada);
    expect(ada.concerns.some((c) => c.about === benId)).toBe(false);
    expect(visit(w, ada, benId)).toBeUndefined();
  });

  it('at 170 a told worry uses the deceased name and the listener relation, not a household id', () => {
    const { w, ada, cole, benId } = scene(170);
    expect(shareConcerns(w, ada, cole)).toBe(1);
    expect(cole.concerns.some((c) => c.about === benId)).toBe(true);
    expect(cole.log.some((e) => e.text.includes('Ben looked hungry'))).toBe(true);
    expect(knowsDeath(cole, benId)).toBe(false);
  });

  it('the switch and an authored world keep the rules-169 drop', () => {
    setKnownWorry(false);
    const off = scene(170);
    noteConcerns(off.w, off.ada);
    expect(visit(off.w, off.ada, off.benId)).toBeUndefined();
    setKnownWorry(true);
    const authored = scene(170, 'authored');
    noteConcerns(authored.w, authored.ada);
    expect(visit(authored.w, authored.ada, authored.benId)).toBeUndefined();
  });
});
