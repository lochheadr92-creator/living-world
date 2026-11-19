// The rules support floor (src/sim/support_floor.ts): which continuation pins `npm test` runs. No simulation here.
import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { RULES_SUPPORT_FLOOR } from '../src/sim/support_floor';
import { pinFiles, pinVersion } from './helpers/archived_pins';

describe('rules support floor', () => {
  it('is a version this build runs, at or below the current one', () => {
    expect(SUPPORTED_RULES_VERSIONS).toContain(RULES_SUPPORT_FLOOR);
    expect(RULES_SUPPORT_FLOOR).toBeLessThanOrEqual(CURRENT_RULES_VERSION);
  });

  it('reads the version out of a pin file name and ignores other tests', () => {
    expect(pinVersion('v173_continuation.test.ts')).toBe(173);
    expect(pinVersion('v28_work_tastes_continuation.test.ts')).toBe(28);
    expect(pinVersion('v256_continuation.expected.json')).toBeNull();
    expect(pinVersion('support_floor.test.ts')).toBeNull();
  });

  it('archives every pin below the floor, keeps every pin at or above it, and misses none', () => {
    const { archived, kept } = pinFiles();
    const all = readdirSync('tests').filter(f => f.endsWith('_continuation.test.ts'));
    expect(archived.length + kept.length).toBe(all.length);
    expect(archived.length).toBeGreaterThan(0);
    expect(kept.length).toBeGreaterThan(0);
    for (const f of archived) expect(pinVersion(f.slice('tests/'.length))!).toBeLessThan(RULES_SUPPORT_FLOOR);
    for (const f of kept) expect(pinVersion(f.slice('tests/'.length))!).toBeGreaterThanOrEqual(RULES_SUPPORT_FLOOR);
  });

  it('with the floor at 1 nothing is archived, so the split is reversible by one number', () => {
    expect(pinFiles('tests', 1).archived).toEqual([]);
  });
});
