// Rules 252: a forest that grows back as fast as a bigger settlement fells it (src/sim/tree_regrowth.ts, read in sources.ts updateSources).
// The effect on a real world is the pin (tests/v252_continuation.*) and the measurement in docs/GROWTH_PLAN.md; these tests pin the chance
// and the switches. Tests that name a rules-251 contrast fail if the rule is taken out.
import { afterEach, describe, expect, it } from 'vitest';
import { TREE_REGROWTH_FACTOR, TREE_SEED_CHANCE, hasTreeRegrowth, setTreeRegrowth, treeRegrowthOn, treeSeedChance } from '../src/sim/tree_regrowth';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { parseIntervention } from '../scripts/lab/lab';
import { done, stage } from './helpers/kit';

afterEach(() => setTreeRegrowth(true));

function world(rules: number) {
  const s = stage('trees-' + rules);
  s.w.settings.dynamics = 'rich';
  s.w.settings.rulesVersion = rules;
  return done(s);
}

describe('rules 252: the chance a mature tree seeds a sapling', () => {
  it('is a supported, current version', () => {
    expect(SUPPORTED_RULES_VERSIONS).toContain(252);
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(252);
  });

  it('is eight times the ordinary chance', () => {
    const w = world(252);
    expect(hasTreeRegrowth(w)).toBe(true);
    expect(TREE_REGROWTH_FACTOR).toBe(8);
    expect(treeSeedChance(w)).toBeCloseTo(TREE_SEED_CHANCE * 8, 12);
    expect(treeSeedChance(w)).toBeGreaterThan(0.0035);
  });
});

describe('rules 252 against rules 251', () => {
  it('rules 251 keeps the ordinary chance (this fails if the rule is taken out)', () => {
    const w = world(251);
    expect(hasTreeRegrowth(w)).toBe(false);
    expect(treeSeedChance(w)).toBe(0.0035);
  });

  it('an authored world keeps the ordinary chance', () => {
    const w = world(252);
    w.settings.dynamics = 'authored';
    expect(treeSeedChance(w)).toBe(0.0035);
  });

  it('the lab switch rich-no-tree-regrowth restores the ordinary chance at 252 and is restored after', () => {
    const iv = parseIntervention('rich-no-tree-regrowth');
    expect(iv.summary).toMatch(/252/);
    const w = world(252);
    const undo = iv.install!();
    expect(treeRegrowthOn()).toBe(false);
    expect(treeSeedChance(w)).toBe(0.0035);
    undo();
    expect(treeSeedChance(w)).toBeGreaterThan(0.0035);
  });
});
