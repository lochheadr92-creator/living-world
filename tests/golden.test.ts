// The ordinary world must stay exactly as it is unless a change says otherwise.
// If this fails: either behaviour changed on purpose (regenerate with `npx vite-node scripts/golden.ts --write` and say so in the
// commit), or something that was meant to be neutral – instrumentation, a refactor, a world profile – changed the ordinary world.
import { describe, expect, it } from 'vitest';
import { GOLDEN_CASES, GOLDEN_SEEDS, computeCase, computeGeneration } from './helpers/golden';
import type { GoldenFile } from './helpers/golden';
import expectedJson from './golden.expected.json';

const expected = expectedJson as unknown as GoldenFile;

describe('golden fingerprints of the ordinary world', () => {
  it('records every case and seed it checks', () => {
    for (const c of GOLDEN_CASES) expect(expected.cases[c.name], `no golden record for case ${c.name}`).toBeTruthy();
    for (const s of GOLDEN_SEEDS) expect(expected.generation[s], `no golden record for seed ${s}`).toBeTruthy();
  });

  it('generates the same terrain, resources, founders and knowledge for each seed', () => {
    for (const seed of GOLDEN_SEEDS) expect(computeGeneration(seed), `generation of ${seed}`).toEqual(expected.generation[seed]);
  });

  for (const c of GOLDEN_CASES) {
    it(`steps ${c.name} to the recorded state at ${c.ticks.join(', ')} ticks`, () => {
      expect(computeCase(c)).toEqual(expected.cases[c.name]);
    }, 300_000);
  }
});
