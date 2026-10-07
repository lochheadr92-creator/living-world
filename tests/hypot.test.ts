// hyp() stands in for Math.hypot in the simulation. It must give the same bits, or every distance in the world would shift.
import { describe, expect, it } from 'vitest';
import { hyp } from '../src/sim/util';
import { RNG } from '../src/sim/rng';

const same = (a: number, b: number): boolean => Object.is(hyp(a, b), Math.hypot(a, b));

describe('hyp', () => {
  it('is Math.hypot, bit for bit, over the numbers the simulation meets', () => {
    const rng = new RNG(7);
    let bad = 0;
    for (let i = 0; i < 2_000_000; i++) {
      // map coordinates and their differences: tile centres and fractions, up to a map's width, both signs
      const a = (rng.next() - 0.5) * 600;
      const b = (rng.next() - 0.5) * 600;
      if (!same(a, b)) bad++;
    }
    expect(bad).toBe(0);
  });

  it('is Math.hypot over every magnitude, tiny to huge, and for whole and half numbers', () => {
    const rng = new RNG(11);
    let bad = 0;
    for (let i = 0; i < 1_000_000; i++) {
      const a = (rng.next() - 0.5) * Math.pow(10, rng.range(-12, 12));
      const b = (rng.next() - 0.5) * Math.pow(10, rng.range(-12, 12));
      if (!same(a, b)) bad++;
    }
    for (let i = 0; i < 200_000; i++) {
      const a = Math.round((rng.next() - 0.5) * 520) / 2;
      const b = Math.round((rng.next() - 0.5) * 520) / 2;
      if (!same(a, b)) bad++;
    }
    expect(bad).toBe(0);
  });

  it('agrees on the edges: zeros, one zero, equal values, NaN, infinity, subnormals, the largest numbers', () => {
    const edge = [0, -0, 1, -1, 0.5, 3, 4, 1e-320, 5e-324, 1e308, Number.MAX_VALUE, Number.MIN_VALUE, Infinity, -Infinity, NaN, 1e-200, 1e200];
    for (const a of edge) for (const b of edge) expect(same(a, b), `${a}, ${b}`).toBe(true);
  });
});
