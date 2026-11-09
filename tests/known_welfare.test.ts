// Rules 179: a worry about someone out of sight is kept or dropped on what the worrier knows, not on the subject's live state.
// Staged as tests/zz_review_d_welfare_truth.test.ts is (that one pins rules 115 and documents the leak): Ada saw Ben 14 tiles away, out of sight.
import { afterEach, describe, expect, it } from 'vitest';
import { generateOptions } from '../src/sim/decision';
import { knownDependent, setKnownWelfare } from '../src/sim/known_welfare';
import { perceive } from '../src/sim/perception';
import { rebuildMobileGrid } from '../src/sim/registry';
import { relOf } from '../src/sim/relations';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import type { Concern } from '../src/sim/types';
import { CONCERN_LIFE, SELF_FIX_WINDOW } from '../src/sim/welfare';
import { addPerson, done, pin, stage } from './helpers/kit';

afterEach(() => { setKnownWelfare(true); });

const OLD = SELF_FIX_WINDOW + 40;

function scene(version: number, o: { age?: number; kind?: Concern['kind']; benAge?: number; benHealth?: number } = {}) {
  const { age = 0, kind = 'hungry', benAge = 30, benHealth = 100 } = o;
  const s = stage(`known-welfare-${version}-${kind}-${benAge}-${benHealth}`);
  const w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = version;
  const ada = addPerson(s, 'Ada', 40, 40, { age: 35, inv: { bread: 4, water: 2 }, hunger: 95, thirst: 95, energy: 95, traits: { generosity: 0.9 } });
  const ben = addPerson(s, 'Ben', 54, 40, { age: benAge, hunger: 95, thirst: 95, energy: 95 });
  done(s);
  for (const p of [ada, ben]) { pin(p); p.needs.warmth = 100; p.needs.safety = 100; }
  ben.health = benHealth;
  rebuildMobileGrid(w);
  perceive(w, ada);
  expect(ada.seen.some((x) => x.id === ben.id)).toBe(false); // 14 tiles: out of sight
  relOf(ada, ben.id).affinity = 30;
  ada.whereabouts[ben.id] = { x: ben.x, y: ben.y, tick: w.tick - age };
  ada.concerns.push({ about: ben.id, kind, seen: w.tick - age, src: 'seen', from: ada.id, checked: -99999 });
  return { w, ada, ben };
}

const visit = (f: ReturnType<typeof scene>) => generateOptions(f.w, f.ada, true, true).options.find((o) => o.key === `visit:${f.ben.id}`);
const cannotManage = (f: ReturnType<typeof scene>) => !!visit(f)?.parts.some(([n]) => n === 'someone who cannot manage alone');

describe('rules 179: a worry about someone out of sight follows what the worrier knows', () => {
  it('is registered and supported (the current version may be later)', () => {
    expect(OLD).toBeLessThan(CONCERN_LIFE);
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(179);
    expect(SUPPORTED_RULES_VERSIONS).toContain(179);
  });

  it('at 178 an adult hurt out of sight keeps the old worry alive and counts as unable to manage alone', () => {
    const f = scene(178, { age: OLD, benHealth: 30 });
    expect(visit(f)?.label).toBe('Bring bread to Ben');
    expect(cannotManage(f)).toBe(true);
  });

  it('at 179 the same worry is out of date, because nobody can know he was hurt', () => {
    expect(visit(scene(179, { age: OLD, benHealth: 30 }))).toBeUndefined();
  });

  it('a healthy adult is dropped at the window at both versions', () => {
    expect(visit(scene(178, { age: OLD }))).toBeUndefined();
    expect(visit(scene(179, { age: OLD }))).toBeUndefined();
  });

  it('a child is kept at both versions and counts as unable to manage alone at 179 whatever his health', () => {
    expect(cannotManage(scene(178, { age: OLD, benAge: 8 }))).toBe(true);
    const f = scene(179, { age: OLD, benAge: 8, benHealth: 100 });
    expect(visit(f)?.label).toBe('Bring bread to Ben');
    expect(cannotManage(f)).toBe(true);
  });

  it('a worry whose kind is hurt is kept at 179 and counts as unable to manage alone', () => {
    const f = scene(179, { age: OLD, kind: 'hurt' });
    expect(visit(f)).toBeDefined();
    expect(cannotManage(f)).toBe(true);
  });

  it('a bereaved worry is not dropped on the subject\'s live life event at 179', () => {
    expect(visit(scene(178, { age: 600, kind: 'bereaved' }))).toBeUndefined();
    expect(visit(scene(179, { age: 600, kind: 'bereaved' }))).toBeDefined();
  });

  it('with the switch off the live health read stays at 179', () => {
    setKnownWelfare(false);
    const f = scene(179, { age: OLD, benHealth: 30 });
    expect(visit(f)?.label).toBe('Bring bread to Ben');
    expect(cannotManage(f)).toBe(true);
  });

  it('knownDependent reads age and the worry kind only', () => {
    const adult = scene(179, { benAge: 30, benHealth: 10 });
    const child = scene(179, { benAge: 8 });
    const elder = scene(179, { benAge: 70, benHealth: 10 });
    expect(knownDependent(adult.w, adult.ben)).toBe(false);
    expect(knownDependent(elder.w, elder.ben)).toBe(false);
    expect(knownDependent(child.w, child.ben)).toBe(true);
    expect(knownDependent(adult.w, adult.ben, { about: adult.ben.id, kind: 'hurt', seen: 0, src: 'seen', from: 0, checked: 0 })).toBe(true);
  });
});
