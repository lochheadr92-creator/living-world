// Rules 250: a workshop that finds no spot near the hub looks 9 tiles further out (src/sim/ring_fallback.ts, called from production.ts
// optPlanFacilities). STAGED: a natural stage world whose ground within 11 tiles of the hub is made solid, so the ordinary ring is empty.
// The ordinary-world evidence is the gen-4 replay and the paired lab. Tests that name a rules-249 contrast fail if the rule is taken out.
import { afterEach, describe, expect, it } from 'vitest';
import { findBuildSpot } from '../src/sim/buildings';
import { hasRingFallback, ordinaryRingEnd, RING_EXTRA, ringFallbackSpot, setRingFallback } from '../src/sim/ring_fallback';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { parseIntervention } from '../scripts/lab/lab';
import { addPerson, done, stage } from './helpers/kit';

afterEach(() => setRingFallback(true));

const HUB = { x: 44, y: 44 };
function crowded(rules: number, blockTo = 11) {
  const s = stage('ring-' + rules);
  s.w.settings.dynamics = 'rich';
  s.w.settings.rulesVersion = rules;
  const p = addPerson(s, 'Mira', HUB.x, HUB.y);
  const w = done(s);
  p.explored.fill(1);
  for (let y = 0; y < w.H; y++) for (let x = 0; x < w.W; x++) if (Math.hypot(x + 0.5 - HUB.x, y + 0.5 - HUB.y) <= blockTo) w.solid[y * w.W + x] = 1;
  return { w, p };
}

describe('rules 250: the band beyond the ordinary ring', () => {
  it('is a supported, current version', () => {
    expect(SUPPORTED_RULES_VERSIONS).toContain(250);
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(250);
  });

  it('with the ring full, a granary finds a spot 11 to 20 tiles out (the ordinary search finds none)', () => {
    const { w, p } = crowded(250);
    expect(findBuildSpot(w, p, 'granary', HUB.x, HUB.y, 3, 11, 6)).toBeNull();
    const spot = ringFallbackSpot(w, p, 'granary', HUB.x, HUB.y)!;
    expect(spot).not.toBeNull();
    const d = Math.hypot(spot.x + 1 - HUB.x, spot.y + 1 - HUB.y);
    expect(d).toBeGreaterThanOrEqual(11);
    expect(d).toBeLessThanOrEqual(11 + RING_EXTRA + 1);
  });

  it('the band is measured from the ordinary edge of each kind: granary 11, bakery 14, kiln 15', () => {
    expect(ordinaryRingEnd('granary')).toBe(11);
    expect(ordinaryRingEnd('hall')).toBe(11);
    expect(ordinaryRingEnd('bakery')).toBe(14);
    expect(ordinaryRingEnd('kiln')).toBe(15);
    expect(ordinaryRingEnd('smithy')).toBe(15);
  });

  it('a person who has not seen the ground beyond the ring finds nothing there', () => {
    const { w, p } = crowded(250);
    p.explored.fill(0);
    expect(ringFallbackSpot(w, p, 'granary', HUB.x, HUB.y)).toBeNull();
  });

  it('when even the band is blocked it still finds nothing', () => {
    const { w, p } = crowded(250, 22);
    expect(ringFallbackSpot(w, p, 'granary', HUB.x, HUB.y)).toBeNull();
  });
});

describe('rules 250 against rules 249', () => {
  it('rules 249 with the same crowded ground finds no spot (this fails if the rule is taken out)', () => {
    const { w, p } = crowded(249);
    expect(hasRingFallback(w)).toBe(false);
    expect(ringFallbackSpot(w, p, 'granary', HUB.x, HUB.y)).toBeNull();
  });

  it('the lab switch rich-no-ring-fallback restores the refusal at 250 and is restored after', () => {
    const iv = parseIntervention('rich-no-ring-fallback');
    expect(iv.summary).toMatch(/250/);
    const { w, p } = crowded(250);
    const undo = iv.install!();
    expect(ringFallbackSpot(w, p, 'granary', HUB.x, HUB.y)).toBeNull();
    undo();
    expect(ringFallbackSpot(w, p, 'granary', HUB.x, HUB.y)).not.toBeNull();
  });
});
