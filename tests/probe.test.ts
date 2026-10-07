// The work counters exist so the cost of the simulation can be explained. They must never change what it does.
import { describe, expect, it } from 'vitest';
import { COUNTER_KEYS, probe, probeReset, probeSnapshot } from '../src/sim/probe';
import { createWorld, defaultSettings } from '../src/sim/factory';
import { stepWorld } from '../src/sim/world';
import { point } from './helpers/golden';

function run(seed: string, ticks: number, counters: boolean) {
  probe.on = counters;
  probeReset();
  const w = createWorld(defaultSettings(seed));
  for (let i = 0; i < ticks; i++) stepWorld(w);
  const snap = probeSnapshot();
  probe.on = false;
  probeReset();
  return { fingerprint: point(w), snap };
}

describe('work counters', () => {
  it('leave the world exactly as it would have been without them', () => {
    const off = run('probe-neutral', 1500, false);
    const on = run('probe-neutral', 1500, true);
    expect(on.fingerprint).toEqual(off.fingerprint);
  });

  it('stay at zero while switched off', () => {
    const off = run('probe-off', 400, false);
    for (const k of COUNTER_KEYS) expect(off.snap[k], k).toBe(0);
  });

  it('count real work when switched on, and count it the same way every time', () => {
    const a = run('probe-count', 900, true);
    const b = run('probe-count', 900, true);
    expect(a.snap).toEqual(b.snap);
    expect(a.snap.perceives).toBeGreaterThan(0);
    expect(a.snap.decisions).toBeGreaterThan(0);
    expect(a.snap.generations).toBeGreaterThanOrEqual(a.snap.decisions);
    expect(a.snap.optionsGenerated).toBeGreaterThan(a.snap.generations);
    expect(a.snap.pathCalls).toBeGreaterThan(0);
    expect(a.snap.pathBudgetHit).toBeLessThanOrEqual(a.snap.pathNull);
    expect(a.snap.pathNull).toBeLessThanOrEqual(a.snap.pathCalls);
  });
});
