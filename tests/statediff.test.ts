// The verifier's own correctness. An equality check that quietly stops looking below some depth would report two different worlds
// as identical, so these hold that the decision is exhaustive and that the printer's truncation never reaches it.
import { describe, expect, it } from 'vitest';
import { deepEqualState, firstDiffs } from '../scripts/statediff';

/** a value buried `depth` levels down */
function nest(depth: number, leaf: unknown): unknown {
  let v: unknown = leaf;
  for (let i = 0; i < depth; i++) v = { down: v };
  return v;
}

describe('the equality decision is exhaustive', () => {
  it('finds a mismatch nine levels deep (the depth the old probe stopped at)', () => {
    expect(deepEqualState(nest(9, 1), nest(9, 2))).toBe(false);
    expect(deepEqualState(nest(9, 1), nest(9, 1))).toBe(true);
  });

  it('finds a mismatch far below any plausible cut-off', () => {
    for (const d of [10, 16, 32, 64]) {
      expect(deepEqualState(nest(d, 'a'), nest(d, 'b')), `depth ${d}`).toBe(false);
      expect(deepEqualState(nest(d, 'a'), nest(d, 'a')), `depth ${d}`).toBe(true);
    }
  });

  it('finds a mismatch deep inside arrays of objects, as a worlds people are', () => {
    const a = { persons: Array.from({ length: 40 }, (_, i) => ({ id: i, beliefs: { 7: { items: { deep: nest(12, i === 39 ? 'x' : 'y') } } } })) };
    const b = JSON.parse(JSON.stringify(a)) as typeof a;
    expect(deepEqualState(a, b)).toBe(true);
    (b.persons[39].beliefs as Record<string, { items: { deep: unknown } }>)[7].items.deep = nest(12, 'changed');
    expect(deepEqualState(a, b)).toBe(false);
  });

  it('does not stop at the first handful of differences the printer would show', () => {
    const a = { xs: Array.from({ length: 200 }, (_, i) => ({ v: i })) };
    const b = { xs: Array.from({ length: 200 }, (_, i) => ({ v: i })) };
    b.xs[199].v = -1; // the 200th element only: well past any print limit
    expect(firstDiffs(a, b, 3).length, 'the printer stops early').toBeLessThanOrEqual(3);
    expect(deepEqualState(a, b), 'the decision does not').toBe(false);
  });

  it('counts an absent key and an undefined value as the same, and a missing key as a difference', () => {
    expect(deepEqualState({ a: 1, b: undefined }, { a: 1 })).toBe(true);
    expect(deepEqualState({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(deepEqualState({ a: [1, 2] }, { a: [1, 2, 3] })).toBe(false);
    expect(deepEqualState({ a: null }, { a: undefined })).toBe(false);
  });

  it('the printer says where the difference is', () => {
    const d = firstDiffs({ persons: [{ needs: { hunger: 10 } }] }, { persons: [{ needs: { hunger: 11 } }] });
    expect(d).toHaveLength(1);
    expect(d[0]).toContain('persons[0].needs.hunger');
    expect(d[0]).toContain('10');
    expect(d[0]).toContain('11');
  });
});
