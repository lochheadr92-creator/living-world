// Rules 212: a little one walks at a little one's pace (src/sim/child_pace.ts; moveSpeed in activities.ts). Every situation here is
// STAGED: it checks the rule, it is not an example of spontaneous behaviour. Each check has the rules-211 contrast.
import { afterEach, describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { moveSpeed, newActivity, startActivity } from '../src/sim/activities';
import { CHILD_PACE, CHILD_PACE_PARTS, LITTLE_AGE, LITTLE_PACE, childPace, setChildPace } from '../src/sim/child_pace';
import { conservationReport } from '../src/sim/economy';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { stepWorld } from '../src/sim/world';
import { addPerson, done, pin, stage } from './helpers/kit';

afterEach(() => setChildPace(true));

/** Pip, four, Tam, nine, and Ada, thirty, side by side on open ground by day, rested and fed. */
function family(version: number, tag = '') {
  const s = stage(`child-pace-${version}-${tag}`);
  const w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = version;
  const pip = addPerson(s, 'Pip', 40, 30, { age: 4 });
  const tam = addPerson(s, 'Tam', 40, 32, { age: 9 });
  const ada = addPerson(s, 'Ada', 40, 34, { age: 30 });
  done(s);
  for (const p of [pip, tam, ada]) p.needs = { hunger: 95, thirst: 95, energy: 95, warmth: 95, safety: 95, social: 90 };
  return { w, pip, tam, ada };
}

describe('rules 212 is registered', () => {
  it('is registered and supported (the current version may be later), with one part', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(212);
    expect(SUPPORTED_RULES_VERSIONS).toContain(212);
    expect(CHILD_PACE_PARTS).toEqual(['little']);
    expect([LITTLE_AGE, LITTLE_PACE, CHILD_PACE]).toEqual([7, 0.72, 0.88]);
  });
});

describe('the pace', () => {
  it('at 211 a four-year-old walks as fast as a nine-year-old; at 212 slower, and the nine-year-old and a grown person are unchanged', () => {
    const old = family(211);
    const now = family(212);
    expect(moveSpeed(old.w, old.pip)).toBeCloseTo(moveSpeed(old.w, old.tam), 9);
    expect(moveSpeed(now.w, now.pip) / moveSpeed(now.w, now.tam)).toBeCloseTo(LITTLE_PACE / CHILD_PACE, 9);
    expect(moveSpeed(now.w, now.tam)).toBeCloseTo(moveSpeed(old.w, old.tam), 9);
    expect(moveSpeed(now.w, now.ada)).toBeCloseTo(moveSpeed(old.w, old.ada), 9);
    // running scales from the slower pace, as anything else does
    expect(moveSpeed(now.w, now.pip, true) / moveSpeed(old.w, old.pip, true)).toBeCloseTo(LITTLE_PACE / CHILD_PACE, 9);
  });

  it('the switch, and an authored world, keep 0.88', () => {
    const now = family(212, 'switch');
    setChildPace(false, 'little');
    expect(childPace(now.w, now.pip)).toBe(CHILD_PACE);
    setChildPace(true);
    now.w.settings.dynamics = 'authored';
    expect(childPace(now.w, now.pip)).toBe(CHILD_PACE);
  });

  it('a child turns from a little one into a child at seven', () => {
    const now = family(212, 'birthday');
    const toSeven = Math.ceil((LITTLE_AGE - 4) * 12 * 2400) + 10;
    expect(childPace(now.w, now.pip)).toBe(LITTLE_PACE);
    now.w.tick += toSeven;
    expect(childPace(now.w, now.pip)).toBe(CHILD_PACE);
  });
});

describe('through to the ground', () => {
  it('walking the same way for the same ticks, the four-year-old covers less ground at 212, and the world continues exactly through a save and load', () => {
    const walk = (version: number) => {
      const f = family(version, 'walk');
      pin(f.tam);
      pin(f.ada);
      // staged: she walks east to a point far off and keeps at it
      const a = newActivity(f.w, f.pip, { kind: 'wander', label: 'Toddle east', goal: 'walk', spotX: 60, spotY: 30, tx: 60, ty: 30, minCommit: 2000, maxTicks: 4000 });
      startActivity(f.w, f.pip, a);
      for (let i = 0; i < 60; i++) stepWorld(f.w);
      return f;
    };
    const old = walk(211);
    const now = walk(212);
    const gone = (x: number) => x - 40;
    expect(gone(old.pip.x)).toBeGreaterThan(1);
    expect(gone(now.pip.x) / gone(old.pip.x)).toBeGreaterThan(0.7);
    expect(gone(now.pip.x) / gone(old.pip.x)).toBeLessThan(0.9);
    const copy = deserializeWorld(serializeWorld(now.w));
    for (let i = 0; i < 40; i++) {
      stepWorld(now.w);
      stepWorld(copy);
    }
    expect(serializeWorld(copy)).toBe(serializeWorld(now.w));
    expect(conservationReport(now.w).ok).toBe(true);
  });
});
