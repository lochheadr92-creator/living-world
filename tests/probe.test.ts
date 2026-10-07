// The work counters exist so the cost of the simulation can be explained. They must never change what it does.
import { describe, expect, it } from 'vitest';
import { COUNTER_KEYS, probe, probePathCells, probeReset, probeSnapshot } from '../src/sim/probe';
import { findPath } from '../src/sim/pathfinding';
import { T } from '../src/sim/types';
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

describe('path search outcomes', () => {
  // a hand-built map: open grass 40×40, a solid wall across x = 20 with no gap, and one open lane beyond for a far goal
  function arena() {
    const w = createWorld(defaultSettings('probe-paths'));
    w.W = 40;
    w.H = 40;
    w.terrain = new Uint8Array(40 * 40).fill(T.GRASS);
    w.solid = new Uint8Array(40 * 40);
    w.wear = new Float32Array(40 * 40);
    return w;
  }

  it('counts a walled-off goal as unreachable and a distant open goal with a tiny budget as out of budget', () => {
    const w = arena();
    for (let y = 0; y < 40; y++) w.solid[y * 40 + 20] = 1;
    probe.on = true;
    probeReset();
    const walled = findPath(w, 3.5, 20.5, 35.5, 20.5, { caller: 'walled' });
    const far = findPath(w, 3.5, 5.5, 18.5, 5.5, { maxNodes: 12, caller: 'far' });
    const near = findPath(w, 3.5, 5.5, 6.5, 5.5, { caller: 'near' });
    const snap = probeSnapshot();
    const cells = probePathCells();
    probe.on = false;
    probeReset();

    expect(walled).toBeNull();
    expect(far).toBeNull();
    expect(near).not.toBeNull();
    expect(snap.pathNull).toBe(2);
    expect(snap.pathUnreachable).toBe(1);
    expect(snap.pathBudgetHit).toBe(1);
    expect(snap.pathNull).toBe(snap.pathUnreachable + snap.pathBudgetHit);
    // the walled search had to try the whole side it was on (20 × 40 tiles) before giving up; the far one stopped at its budget
    expect(cells['walled|1'].unreachable).toBe(1);
    expect(cells['walled|1'].expandedUnreachable).toBeGreaterThan(700);
    expect(cells['far|0'].budget).toBe(1);
    expect(cells['far|0'].expandedBudget).toBe(13);
    expect(cells['near|0'].ok).toBe(1);
  });

  it('files each search under the distance bucket of its straight line, and resets with the counters', () => {
    const w = arena();
    probe.on = true;
    probeReset();
    findPath(w, 1.5, 1.5, 11.5, 1.5, { caller: 'a' }); // 10
    findPath(w, 1.5, 1.5, 31.5, 1.5, { caller: 'a' }); // 30
    findPath(w, 1.5, 1.5, 39.5, 38.5, { caller: 'a' }); // about 53
    const cells = probePathCells();
    probeReset();
    const after = probePathCells();
    probe.on = false;
    expect(Object.keys(cells).sort()).toEqual(['a|0', 'a|1', 'a|2']);
    expect(Object.keys(after)).toEqual([]);
  });

  it('records nothing while switched off', () => {
    const w = arena();
    probe.on = false;
    probeReset();
    findPath(w, 1.5, 1.5, 11.5, 1.5, { caller: 'off' });
    expect(Object.keys(probePathCells())).toEqual([]);
  });
});

describe('path search verification (diagnostic)', () => {
  function arena() {
    const w = createWorld(defaultSettings('probe-verify'));
    w.W = 40;
    w.H = 40;
    w.terrain = new Uint8Array(40 * 40).fill(T.GRASS);
    w.solid = new Uint8Array(40 * 40);
    w.wear = new Float32Array(40 * 40);
    return w;
  }

  it('says whether a search that ran out of budget could have found its goal, without changing the answer', () => {
    const w = arena();
    for (let y = 0; y < 40; y++) w.solid[y * 40 + 20] = 1;
    const run = (verify: boolean) => {
      probe.on = true;
      probe.verify = verify;
      probeReset();
      const far = findPath(w, 3.5, 5.5, 18.5, 5.5, { maxNodes: 12, caller: 'far' });
      const walled = findPath(w, 3.5, 5.5, 35.5, 5.5, { maxNodes: 12, caller: 'walled' });
      const snap = probeSnapshot();
      const cells = probePathCells();
      probe.on = false;
      probe.verify = false;
      probeReset();
      return { far, walled, snap, cells };
    };
    const plain = run(false);
    const checked = run(true);
    // same results, same counters for the search itself
    expect(checked.far).toEqual(plain.far);
    expect(checked.walled).toEqual(plain.walled);
    expect(checked.snap).toEqual(plain.snap);
    // unverified: both just "budget"
    expect(plain.cells['far|0'].budget).toBe(1);
    expect(plain.cells['far|0'].budgetReachable).toBe(0);
    // verified: the open goal was reachable (and needed more than 12 tiles), the walled one was not
    expect(checked.cells['far|0'].budgetReachable).toBe(1);
    expect(checked.cells['far|0'].tilesNeeded).toBeGreaterThan(12);
    expect(checked.cells['walled|1'].budgetUnreachable).toBe(1);
    expect(checked.cells['walled|1'].budgetReachable).toBe(0);
  });
});
