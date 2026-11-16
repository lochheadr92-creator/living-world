// Rules 255: farming draws people, most when the wild food they know is thinning (src/sim/farm_draw.ts, read in options_work.ts optFarm).
// Tests that name a rules-254 contrast fail if the rule is taken out.
import { afterEach, describe, expect, it } from 'vitest';
import { BASE_DRAW, THIN_DRAW, farmDraw, farmDrawPartOn, setFarmDraw, wildThinness } from '../src/sim/farm_draw';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { parseIntervention } from '../scripts/lab/lab';
import { addPerson, done, stage } from './helpers/kit';
import type { Belief, Person, World } from '../src/sim/types';

afterEach(() => setFarmDraw(true));

function scene(rules: number) {
  const s = stage('draw-' + rules);
  s.w.settings.dynamics = 'rich';
  s.w.settings.rulesVersion = rules;
  const p = addPerson(s, 'Ann', 10, 10);
  return { w: done(s), p };
}
/** plant `n` seen wild-food beliefs, each holding `share` of its capacity, seen `age` ticks ago */
function believe(w: World, p: Person, n: number, share: number, age = 100): void {
  for (let i = 0; i < n; i++) {
    const id = 900000 + i;
    const b = { id, kind: 'berry_bush', x: 12 + i, y: 12, amount: share * 10, max: 10, seen: w.tick - age, src: 'seen', from: p.id, learned: w.tick - age } as Belief;
    p.beliefs[id] = b;
    (p.bykind.berry_bush ??= []).push(id);
  }
}

describe('rules 255: the pull toward the fields', () => {
  it('is a supported, current version', () => {
    expect(SUPPORTED_RULES_VERSIONS).toContain(255);
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(255);
  });
  it('is the flat draw when the wild food known is plentiful', () => {
    const { w, p } = scene(255);
    believe(w, p, 5, 0.9);
    expect(wildThinness(w, p)).toBe(0);
    expect(farmDraw(w, p)).toBe(BASE_DRAW);
  });
  it('is the flat draw plus the full thin draw when the wild food known is gone', () => {
    const { w, p } = scene(255);
    believe(w, p, 5, 0);
    expect(wildThinness(w, p)).toBe(1);
    expect(farmDraw(w, p)).toBe(BASE_DRAW + THIN_DRAW);
  });
  it('is partway when the wild food stands at 0.3 of capacity (half of 0.6 short)', () => {
    const { w, p } = scene(255);
    believe(w, p, 5, 0.3);
    expect(wildThinness(w, p)).toBeCloseTo(0.5, 6);
  });
  it('feels nothing from fewer than three wild places, or from old or told ones', () => {
    const { w, p } = scene(255);
    believe(w, p, 2, 0);
    expect(wildThinness(w, p)).toBe(0);
    const s2 = scene(255);
    believe(s2.w, s2.p, 5, 0, 9000);
    expect(wildThinness(s2.w, s2.p)).toBe(0);
  });
});

describe('rules 255 against rules 254', () => {
  it('rules 254 adds nothing (this fails if the rule is taken out)', () => {
    const { w, p } = scene(254);
    believe(w, p, 5, 0);
    expect(farmDraw(w, p)).toBe(0);
  });
  it('an authored world adds nothing', () => {
    const { w, p } = scene(255);
    w.settings.dynamics = 'authored';
    believe(w, p, 5, 0);
    expect(farmDraw(w, p)).toBe(0);
  });
  it('the lab switch removes both parts, or one, and is restored after', () => {
    const { w, p } = scene(255);
    believe(w, p, 5, 0);
    const all = parseIntervention('rich-no-farm-draw');
    expect(all.summary).toMatch(/255/);
    const undo = all.install!();
    expect(farmDraw(w, p)).toBe(0);
    undo();
    expect(farmDraw(w, p)).toBe(BASE_DRAW + THIN_DRAW);
    const thin = parseIntervention('rich-no-farm-draw-thin').install!();
    expect(farmDrawPartOn('thin')).toBe(false);
    expect(farmDraw(w, p)).toBe(BASE_DRAW);
    thin();
  });
});
