// Rules 234: the ids of real things and of water knowledge no longer meet (src/sim/id_ranges.ts), and a save whose id counter
// is not beyond the ids in use is refused whatever its rules (src/app/save.ts). Answers gap ledger G226 and G227 and the
// adversarial review's AR-02, AR-03 and AR-04 (docs/ADVERSARIAL_REVIEW_20261113.md), whose reproductions are restated here.
import { describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { WATER_IDS_BEFORE, WATER_IDS_FROM, checkCounter, pairKey, waterIdBase } from '../src/sim/id_ranges';
import { isWaterBeliefId, waterBeliefId } from '../src/sim/knowledge';
import { newId } from '../src/sim/registry';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import type { World } from '../src/sim/types';
import { natural, run } from './helpers/util';

const world = (seed: string, version: number, dynamics: 'rich' | 'authored' = 'rich'): World => natural(seed, { dynamics, rulesVersion: version });
const waterIds = (w: World): number[] => w.persons.flatMap((p) => Object.values(p.beliefs).filter((b) => b.kind === 'water').map((b) => b.id));

describe('rules 234: the ids of real things and of water knowledge no longer meet', () => {
  it('is a supported version at or below the current one', () => {
    expect(SUPPORTED_RULES_VERSIONS).toContain(234);
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(234);
    expect([WATER_IDS_BEFORE, WATER_IDS_FROM]).toEqual([1_000_000, 2 ** 40]);
    expect(Number.isSafeInteger(WATER_IDS_FROM + 10_000_000)).toBe(true);
  });

  it('water knowledge is numbered from two to the fortieth at 234, and from a million before and in an authored world', () => {
    const now = world('ids-a', 234), old = world('ids-a', 233), authored = world('ids-a', 234, 'authored');
    expect([waterIdBase(now), waterIdBase(old), waterIdBase(authored)]).toEqual([WATER_IDS_FROM, WATER_IDS_BEFORE, WATER_IDS_BEFORE]);
    const a = waterIds(now), b = waterIds(old);
    expect(a.length).toBeGreaterThan(0);
    expect(a.length).toBe(b.length); // the same shore known by the same people
    expect(a.every((id) => id >= WATER_IDS_FROM)).toBe(true);
    expect(b.every((id) => id >= WATER_IDS_BEFORE && id < WATER_IDS_FROM)).toBe(true);
    expect(a.map((id) => id - WATER_IDS_FROM)).toEqual(b.map((id) => id - WATER_IDS_BEFORE)); // the same cells
    expect(waterBeliefId(now, 12)).toBe(WATER_IDS_FROM + 12);
  });

  it('AR-04: a real thing numbered past a million is not taken for water at 234 (it was before)', () => {
    const now = world('ids-b', 234), old = world('ids-b', 233);
    expect(isWaterBeliefId(old, 1_000_012)).toBe(true); // the defect, as recorded
    expect(isWaterBeliefId(now, 1_000_012)).toBe(false);
    expect(isWaterBeliefId(now, WATER_IDS_FROM + 12)).toBe(true);
  });

  it('the counter is refused the water range at 234, so the two cannot meet', () => {
    const now = world('ids-c', 234), old = world('ids-c', 233);
    expect(newId(now)).toBeLessThan(WATER_IDS_BEFORE);
    now.nextId = WATER_IDS_FROM;
    expect(() => newId(now)).toThrow(/range kept for water knowledge/);
    expect(checkCounter(old, WATER_IDS_FROM)).toBe(WATER_IDS_FROM); // an older world is as it was
    old.nextId = 1_000_000;
    expect(newId(old)).toBe(1_000_000); // and still walks into its own water range: the recorded defect, kept
  });

  it('AR-03: telling one listener of a water cell no longer stands for telling another of a thing with the same number', () => {
    const now = world('ids-d', 234), old = world('ids-d', 233);
    // listener 100 told of water cell 12, against listener 101 told of thing 12
    expect(pairKey(old, 100, WATER_IDS_BEFORE + 12)).toBe(pairKey(old, 101, 12)); // the defect, as recorded
    expect(pairKey(now, 100, WATER_IDS_FROM + 12)).not.toBe(pairKey(now, 101, 12));
    expect(String(pairKey(now, 101, 12))).toBe('101:12');
    const told: Record<number, number> = {};
    told[pairKey(now, 100, WATER_IDS_FROM + 12)] = 5;
    expect(told[pairKey(now, 101, 12)]).toBeUndefined();
    expect(JSON.parse(JSON.stringify(told))[`100:${WATER_IDS_FROM + 12}`]).toBe(5); // and it survives a save as text
  });

  it('AR-02: a save whose id counter is not beyond the ids in use, or in which two things share an id, is refused', () => {
    for (const version of [228, 234]) {
      const w = world('ids-e', version);
      run(w, 200);
      const good = serializeWorld(w);
      expect(() => deserializeWorld(good)).not.toThrow();
      const living = w.persons.find((p) => p.alive)!;
      const parsed = JSON.parse(good);
      parsed.world.nextId = living.id; // the review's reproduction: the next id handed out would be a living person's
      expect(() => deserializeWorld(JSON.stringify(parsed))).toThrow(/id counter is not beyond the ids in use/);
      const twice = JSON.parse(good);
      twice.world.sources[1].id = twice.world.sources[0].id;
      expect(() => deserializeWorld(JSON.stringify(twice))).toThrow(/two things share an id/);
    }
  });

  it('an ordinary 234 world tells of water under the new keys, and saved and loaded it continues the same', () => {
    const w = world('ids-f', 234);
    run(w, 2400);
    expect(waterIds(w).every((id) => id >= WATER_IDS_FROM)).toBe(true);
    const keys = w.persons.flatMap((p) => Object.keys(p.told));
    expect(keys.length).toBeGreaterThan(0);
    expect(keys.every((k) => /^\d+:\d+$/.test(k))).toBe(true);
    const copy = deserializeWorld(serializeWorld(w));
    run(w, 300);
    run(copy, 300);
    expect(serializeWorld(copy)).toBe(serializeWorld(w));
  }, 120000);
});
