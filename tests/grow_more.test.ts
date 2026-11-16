// Rules 254: more food grows, and faster (src/sim/grow_more.ts, read in plenty.ts). The effect on a real world is the pin and the lab; these
// tests pin the figures and the switches. Tests that name a rules-253 contrast fail if the rule is taken out.
import { afterEach, describe, expect, it } from 'vitest';
import { CROP_FACTOR, WILD_FACTOR, cropGrowFactor, growMorePartOn, setGrowMore, wildGrowFactor } from '../src/sim/grow_more';
import { cropPlenty, wildPlenty } from '../src/sim/plenty';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { parseIntervention } from '../scripts/lab/lab';
import { done, stage } from './helpers/kit';

afterEach(() => setGrowMore(true));
function world(rules: number) {
  const s = stage('grow-' + rules);
  s.w.settings.dynamics = 'rich';
  s.w.settings.rulesVersion = rules;
  return done(s);
}

describe('rules 254: how fast wild food comes back and how much grain a plot carries', () => {
  it('is a supported, current version', () => {
    expect(SUPPORTED_RULES_VERSIONS).toContain(254);
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(254);
  });
  it('wild food comes back four times as fast, a plot carries three times the grain', () => {
    const w = world(254);
    expect(WILD_FACTOR).toBe(4);
    expect(CROP_FACTOR).toBe(3);
    expect(wildPlenty(w, 'berry_bush')).toBe(4);
    expect(wildPlenty(w, 'fish_spot')).toBe(4);
    expect(wildPlenty(w, 'tree')).toBe(1);
    expect(cropPlenty(w)).toBe(3);
  });
});

describe('rules 254 against rules 253', () => {
  it('rules 253 keeps rules 226 figures: wild twice, crops twice (this fails if the rule is taken out)', () => {
    const w = world(253);
    expect(wildGrowFactor(w, 2)).toBe(2);
    expect(wildPlenty(w, 'berry_bush')).toBe(2);
    expect(cropPlenty(w)).toBe(2);
  });
  it('rules 225 keeps neither', () => {
    const w = world(225);
    expect(wildPlenty(w, 'berry_bush')).toBe(1);
    expect(cropPlenty(w)).toBe(1);
  });
  it('an authored world keeps neither', () => {
    const w = world(254);
    w.settings.dynamics = 'authored';
    expect(wildPlenty(w, 'berry_bush')).toBe(1);
    expect(cropGrowFactor(w, 2)).toBe(2);
  });
  it('the lab switch removes both parts, or one, and is restored after', () => {
    const w = world(254);
    const all = parseIntervention('rich-no-grow-more');
    expect(all.summary).toMatch(/254/);
    const undo = all.install!();
    expect(wildPlenty(w, 'berry_bush')).toBe(2);
    expect(cropPlenty(w)).toBe(2);
    undo();
    expect(wildPlenty(w, 'berry_bush')).toBe(4);
    const wild = parseIntervention('rich-no-grow-more-wild').install!();
    expect(growMorePartOn('wild')).toBe(false);
    expect(cropPlenty(w)).toBe(3);
    wild();
    expect(growMorePartOn('wild')).toBe(true);
  });
  it('an unknown part is refused', () => {
    expect(() => parseIntervention('rich-no-grow-more-nonsense')).toThrow(/no such part/);
  });
});
