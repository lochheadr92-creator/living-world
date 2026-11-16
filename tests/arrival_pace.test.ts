// Rules 251: a bigger settlement draws newcomers faster (src/sim/arrival_pace.ts, called from lifecycle.ts immigrationTick). The effect on a
// real world is the pin (tests/v251_continuation.*) and the paired lab; these tests pin the arithmetic and the switches. Tests that name a
// rules-250 contrast fail if the rule is taken out.
import { afterEach, describe, expect, it } from 'vitest';
import { ARRIVAL_PACE_FLOOR, arrivalPaceOn, arrivalSpacingFor, hasArrivalPace, setArrivalPace } from '../src/sim/arrival_pace';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { parseIntervention } from '../scripts/lab/lab';
import { done, stage } from './helpers/kit';

afterEach(() => setArrivalPace(true));

function world(rules: number) {
  const s = stage('pace-' + rules);
  s.w.settings.dynamics = 'rich';
  s.w.settings.rulesVersion = rules;
  return done(s);
}

describe('rules 251: the spacing between arriving groups', () => {
  it('is a supported, current version', () => {
    expect(SUPPORTED_RULES_VERSIONS).toContain(251);
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(251);
  });

  it('is the ordinary spacing at 28 people or fewer', () => {
    const w = world(251);
    expect(arrivalSpacingFor(w, 10, 6000)).toBe(6000);
    expect(arrivalSpacingFor(w, 28, 6000)).toBe(6000);
  });

  it('falls with the square root of the people: about 4,200 at 56, 3,400 at 84, 2,700 at 140', () => {
    const w = world(251);
    expect(arrivalSpacingFor(w, 56, 6000)).toBe(Math.round(6000 * Math.sqrt(0.5)));
    expect(arrivalSpacingFor(w, 84, 6000)).toBe(Math.round(6000 * Math.sqrt(28 / 84)));
    expect(arrivalSpacingFor(w, 140, 6000)).toBe(Math.round(6000 * Math.sqrt(0.2)));
  });

  it('never goes below a fifth of the ordinary spacing', () => {
    const w = world(251);
    expect(arrivalSpacingFor(w, 100000, 6000)).toBe(Math.round(6000 * ARRIVAL_PACE_FLOOR));
  });

  it('the spacing is shorter for a larger settlement at every size', () => {
    const w = world(251);
    let last = Infinity;
    for (const n of [30, 40, 60, 90, 130, 200]) {
      const s = arrivalSpacingFor(w, n, 6000);
      expect(s).toBeLessThan(last);
      last = s;
    }
  });
});

describe('rules 251 against rules 250', () => {
  it('rules 250 keeps the fixed spacing at 140 people (this fails if the rule is taken out)', () => {
    const w = world(250);
    expect(hasArrivalPace(w)).toBe(false);
    expect(arrivalSpacingFor(w, 140, 6000)).toBe(6000);
  });

  it('an authored world keeps the fixed spacing', () => {
    const w = world(251);
    w.settings.dynamics = 'authored';
    expect(arrivalSpacingFor(w, 140, 6000)).toBe(6000);
  });

  it('the lab switch rich-no-arrival-pace restores the fixed spacing at 251 and is restored after', () => {
    const iv = parseIntervention('rich-no-arrival-pace');
    expect(iv.summary).toMatch(/251/);
    const w = world(251);
    const undo = iv.install!();
    expect(arrivalPaceOn()).toBe(false);
    expect(arrivalSpacingFor(w, 140, 6000)).toBe(6000);
    undo();
    expect(arrivalSpacingFor(w, 140, 6000)).toBeLessThan(6000);
  });
});
