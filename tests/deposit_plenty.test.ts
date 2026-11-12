// Rules 231: stone outcrops and ore veins hold ten times as much (src/sim/deposit_plenty.ts; read in worldgen.ts placeDeposits).
// Ordinary worlds made side by side at rules 230 and 231: the same deposits in the same places, each holding ten times as much.
import { afterEach, describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { DEPOSIT_PLENTY, DEPOSIT_PLENTY_PARTS, setDepositPlenty } from '../src/sim/deposit_plenty';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import type { Source, SourceType, World } from '../src/sim/types';
import { natural, run } from './helpers/util';

afterEach(() => setDepositPlenty(true));

const world = (seed: string, version: number, dynamics: 'rich' | 'authored' = 'rich'): World => natural(seed, { dynamics, rulesVersion: version });
const of = (w: World, type: SourceType): Source[] => w.sources.filter((s) => s.type === type).sort((a, b) => a.x - b.x || a.y - b.y);
const at = (list: Source[]): string => list.map((s) => `${s.x},${s.y}`).join(' ');
const held = (list: Source[]): number[] => list.map((s) => s.amount);

describe('rules 231: stone outcrops and ore veins hold ten times as much', () => {
  it('is a supported version at or below the current one', () => {
    expect(SUPPORTED_RULES_VERSIONS).toContain(231);
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(231);
    expect(DEPOSIT_PLENTY).toBe(10);
    expect(DEPOSIT_PLENTY_PARTS).toEqual(['stone', 'ore']);
  });

  for (const seed of ['deposit-a', 'deposit-b', 'deposit-c']) {
    it(`${seed}: the same outcrops and veins in the same places, each within rounding of ten times what it held`, () => {
      const old = world(seed, 230), now = world(seed, 231);
      for (const type of ['outcrop', 'ore_vein'] as const) {
        const a = of(old, type), b = of(now, type);
        expect(a.length).toBeGreaterThan(0);
        expect(at(b)).toBe(at(a));
        for (let i = 0; i < a.length; i++) {
          expect(Math.abs(b[i].amount - 10 * a[i].amount)).toBeLessThanOrEqual(5); // each is rounded once, before or after the ten
          expect(b[i].max).toBeGreaterThanOrEqual(b[i].amount);
        }
      }
      // nothing else on the map is touched: the same loose rocks, clay pits, trees and food, holding the same
      for (const type of ['rock', 'clay_pit', 'tree', 'berry_bush', 'fish_spot', 'wild_grain', 'fruit_tree'] as const) {
        expect(at(of(now, type))).toBe(at(of(old, type)));
        expect(held(of(now, type))).toEqual(held(of(old, type)));
      }
      expect(now.sources.length).toBe(old.sources.length);
    });
  }

  it('each part alone: stone without ore, ore without stone; both off lays the world down as rules 230 does', () => {
    const old = world('deposit-parts', 230);
    setDepositPlenty(false, 'ore');
    const stoneOnly = world('deposit-parts', 231);
    expect(held(of(stoneOnly, 'ore_vein'))).toEqual(held(of(old, 'ore_vein')));
    expect(held(of(stoneOnly, 'outcrop'))[0]).toBeGreaterThan(5 * held(of(old, 'outcrop'))[0]);
    setDepositPlenty(true);
    setDepositPlenty(false, 'stone');
    const oreOnly = world('deposit-parts', 231);
    expect(held(of(oreOnly, 'outcrop'))).toEqual(held(of(old, 'outcrop')));
    expect(held(of(oreOnly, 'ore_vein'))[0]).toBeGreaterThan(5 * held(of(old, 'ore_vein'))[0]);
    setDepositPlenty(false);
    const neither = world('deposit-parts', 231);
    for (const type of ['outcrop', 'ore_vein'] as const) expect(held(of(neither, type))).toEqual(held(of(old, type)));
  });

  it('an authored world is laid down as it was', () => {
    const a = world('deposit-authored', 231, 'authored'), b = world('deposit-authored', 230, 'authored');
    for (const type of ['outcrop', 'ore_vein'] as const) expect(held(of(a, type))).toEqual(held(of(b, type)));
  });

  it('nothing new is saved: a world saved and loaded continues the same', () => {
    const w = world('deposit-save', 231);
    run(w, 600);
    const copy = deserializeWorld(serializeWorld(w));
    run(w, 300);
    run(copy, 300);
    expect(serializeWorld(copy)).toBe(serializeWorld(w));
  });
});
