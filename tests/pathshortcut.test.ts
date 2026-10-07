// A search for one particular tile that nothing can step onto returns null at once instead of flooding the map to find that out.
// The answer must be the same as the full search's, always.
import { describe, expect, it } from 'vitest';
import { findPath } from '../src/sim/pathfinding';
import { probe, probePathCells, probeReset, probeSnapshot } from '../src/sim/probe';
import { RNG } from '../src/sim/rng';
import { settingsForProfile } from '../src/sim/profiles';
import { createWorld } from '../src/sim/factory';
import { natural, run } from './helpers/util';

describe('a search for a tile that cannot be entered', () => {
  it('gives the answer the full search gives, for every kind of start and goal on real maps', () => {
    for (const w of [run2(natural('shortcut-a')), createWorld(settingsForProfile('large', 'shortcut-b', { immigration: false }))]) {
      const rng = new RNG(99);
      let walled = 0;
      let reached = 0;
      for (let i = 0; i < 400; i++) {
        const sx = rng.range(2, w.W - 2);
        const sy = rng.range(2, w.H - 2);
        const gx = Math.min(w.W - 1, Math.max(0, Math.floor(sx + (rng.next() - 0.5) * 60)));
        const gy = Math.min(w.H - 1, Math.max(0, Math.floor(sy + (rng.next() - 0.5) * 60)));
        const quick = findPath(w, sx, sy, gx + 0.5, gy + 0.5, { maxNodes: 1500 });
        // naming the same goal as a goalFn runs the search that was always run
        const full = findPath(w, sx, sy, gx + 0.5, gy + 0.5, { maxNodes: 1500, goalFn: (x, y) => x === gx && y === gy });
        expect(quick).toEqual(full);
        if (full === null) walled++;
        else reached++;
      }
      expect(walled).toBeGreaterThan(5); // the test did meet unreachable goals
      expect(reached).toBeGreaterThan(50);
    }
  });

  it('does none of the flooding: no tiles expanded, counted as unreachable', () => {
    const w = natural('shortcut-c');
    // a solid tile somewhere with open ground around it
    let gx = -1;
    let gy = -1;
    for (let i = 0; i < w.solid.length && gx < 0; i++) if (w.solid[i]) [gx, gy] = [i % w.W, Math.floor(i / w.W)];
    expect(gx).toBeGreaterThanOrEqual(0);
    probe.on = true;
    probeReset();
    const a = findPath(w, w.camp.x, w.camp.y, gx + 0.5, gy + 0.5, { caller: 'solid goal' });
    const snap = probeSnapshot();
    const cells = probePathCells();
    probe.on = false;
    probeReset();
    expect(a).toBeNull();
    expect(snap.pathExpanded).toBe(0);
    expect(snap.pathUnreachable).toBe(1);
    expect(snap.pathBudgetHit).toBe(0);
    expect(Object.values(cells)[0].unreachable).toBe(1);
  });
});

function run2<T extends ReturnType<typeof natural>>(w: T): T {
  run(w, 300);
  return w;
}
