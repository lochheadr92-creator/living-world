// Paired comparison across seeds: the mean of (branch − control) with a bootstrap confidence interval. Deterministic (fixed seed).
import { RNG } from '../../src/sim/rng';

export const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / Math.max(1, v.length);
export function sd(v: number[]): number {
  if (v.length < 2) return 0;
  const m = mean(v);
  return Math.sqrt(v.reduce((a, b) => a + (b - m) * (b - m), 0) / (v.length - 1));
}

export interface PairedStat {
  n: number;
  meanDiff: number;
  lo: number;
  hi: number;
  higher: number;
  lower: number;
}

/** 95% percentile bootstrap interval for the mean of `diffs` (one per seed). With fewer than 2 values it is degenerate. */
export function paired(diffs: number[], resamples = 4000): PairedStat {
  const n = diffs.length;
  const m = mean(diffs);
  const higher = diffs.filter((d) => d > 0).length;
  const lower = diffs.filter((d) => d < 0).length;
  if (n < 2) return { n, meanDiff: m, lo: m, hi: m, higher, lower };
  const rng = new RNG(0x1ab0 + n);
  const means: number[] = [];
  for (let r = 0; r < resamples; r++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += diffs[rng.int(n)];
    means.push(s / n);
  }
  means.sort((a, b) => a - b);
  return { n, meanDiff: m, lo: means[Math.floor(0.025 * resamples)], hi: means[Math.floor(0.975 * resamples)], higher, lower };
}

export type Verdict = 'identical' | 'too few seeds to say' | 'larger than chance' | 'systematic, within the noise floor' | 'not distinguishable from chance';

/**
 * `noiseSd` is the spread of a one-draw nudge's differences from the control (what chance alone does to one seed). An effect is
 * "larger than chance" when the interval excludes 0 and the mean difference is at least that spread. A bootstrap over fewer than
 * `minSeeds` seeds is too optimistic to be trusted, so no verdict is given.
 */
export function verdict(st: PairedStat, noiseSd: number, identical: boolean, minSeeds = 6): Verdict {
  if (identical) return 'identical';
  if (st.n < minSeeds) return 'too few seeds to say';
  const excludesZero = st.lo > 0 || st.hi < 0;
  if (!excludesZero) return 'not distinguishable from chance';
  return Math.abs(st.meanDiff) >= noiseSd ? 'larger than chance' : 'systematic, within the noise floor';
}
