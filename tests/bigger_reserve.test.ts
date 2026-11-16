// Rules 253: a household puts by for the whole lean stretch (src/sim/bigger_reserve.ts, read in provision.ts preparationWanted). The effect on
// a real world is the pin (tests/v253_continuation.*) and the measurement in docs/GROWTH_PLAN.md; these tests pin the figures and the switches.
// Tests that name a rules-252 contrast fail if the rule is taken out.
import { afterEach, describe, expect, it } from 'vitest';
import { BIGGER_RESERVE_DAYS, BIGGER_RESERVE_WINDOW, biggerReservePartOn, seasonReserveCap, seasonReserveDays, seasonWindowDays, setBiggerReserve } from '../src/sim/bigger_reserve';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { parseIntervention } from '../scripts/lab/lab';
import { done, stage } from './helpers/kit';

afterEach(() => setBiggerReserve(true));

function world(rules: number) {
  const s = stage('reserve-' + rules);
  s.w.settings.dynamics = 'rich';
  s.w.settings.rulesVersion = rules;
  return done(s);
}

describe('rules 253: the season reserve', () => {
  it('is a supported, current version', () => {
    expect(SUPPORTED_RULES_VERSIONS).toContain(253);
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(253);
  });
  it('asks three days a head, with no flat cap, and opens five days before winter', () => {
    const w = world(253);
    expect(seasonReserveDays(w, 2)).toBe(BIGGER_RESERVE_DAYS);
    expect(BIGGER_RESERVE_DAYS).toBe(3);
    expect(seasonReserveCap(w, 20)).toBe(Infinity);
    expect(seasonWindowDays(w, 3)).toBe(BIGGER_RESERVE_WINDOW);
    expect(BIGGER_RESERVE_WINDOW).toBe(5);
  });
});

describe('rules 253 against rules 252', () => {
  it('rules 252 keeps two days, the cap of 20 and the three-day window (this fails if the rule is taken out)', () => {
    const w = world(252);
    expect(seasonReserveDays(w, 2)).toBe(2);
    expect(seasonReserveCap(w, 20)).toBe(20);
    expect(seasonWindowDays(w, 3)).toBe(3);
  });
  it('an authored world keeps the old figures', () => {
    const w = world(253);
    w.settings.dynamics = 'authored';
    expect(seasonReserveDays(w, 2)).toBe(2);
    expect(seasonWindowDays(w, 3)).toBe(3);
  });
  it('the lab switch removes both parts, or one, and is restored after', () => {
    const w = world(253);
    const all = parseIntervention('rich-no-bigger-reserve');
    expect(all.summary).toMatch(/253/);
    const undo = all.install!();
    expect(seasonReserveCap(w, 20)).toBe(20);
    expect(seasonWindowDays(w, 3)).toBe(3);
    undo();
    expect(seasonReserveCap(w, 20)).toBe(Infinity);
    const size = parseIntervention('rich-no-bigger-reserve-size');
    const undoSize = size.install!();
    expect(biggerReservePartOn('size')).toBe(false);
    expect(seasonWindowDays(w, 3)).toBe(5);
    undoSize();
    expect(biggerReservePartOn('size')).toBe(true);
  });
  it('an unknown part is refused', () => {
    expect(() => parseIntervention('rich-no-bigger-reserve-nonsense')).toThrow(/no such part/);
  });
});
