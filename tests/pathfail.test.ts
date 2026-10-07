// What a failed search costs. The path finder floods everything it can reach before it gives up, so a goal that cannot be reached is the
// expensive kind of search (docs/SCALING.md). A roaming wolf whose goal it cannot reach used to ask again on every tick; now it does not
// ask again while the answer cannot have changed (same tile, same goal tile, same solid tiles). That must change nothing the world does.
import { describe, expect, it } from 'vitest';
import { probe, probeReset, probeSnapshot } from '../src/sim/probe';
import { solidChanged } from '../src/sim/registry';
import { settingsForProfile } from '../src/sim/profiles';
import { createWorld } from '../src/sim/factory';
import { T } from '../src/sim/types';
import type { World } from '../src/sim/types';
import { hashWorld, stepWorld } from '../src/sim/world';
import { makeWolf, setWolfSearchMemory, updateWildlife } from '../src/sim/wildlife';
import { deepHash } from './helpers/golden';
import { natural } from './helpers/util';

/** a one-tile pocket of open ground at (cx, cy) walled in by solid tiles: it can be stood on, and cannot be reached */
function pocket(w: World, cx: number, cy: number): void {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const i = (cy + dy) * w.W + (cx + dx);
      w.terrain[i] = T.GRASS;
      w.solid[i] = dx === 0 && dy === 0 ? 0 : 1;
    }
  }
}

function openGround(w: World): { x: number; y: number } {
  for (let r = 0; r < 40; r++) {
    for (let k = 0; k < 40; k++) {
      const x = Math.floor(w.camp.x) + 10 + r;
      const y = Math.floor(w.camp.y) + k - 20;
      let ok = true;
      for (let dy = -6; dy <= 6 && ok; dy++) for (let dx = -6; dx <= 6 && ok; dx++) if (w.terrain[(y + dy) * w.W + x + dx] === T.DEEP) ok = false;
      if (ok && x < w.W - 20 && y > 8 && y < w.H - 8) return { x, y };
    }
  }
  throw new Error('no open ground');
}

/** a wolf roaming toward a goal in a walled-in pocket, with nothing else going on */
function walledGoalWorld(seed: string) {
  const w = natural(seed);
  w.animals.length = 0;
  const at = openGround(w);
  pocket(w, at.x + 12, at.y);
  const wolf = makeWolf(w, at.x, at.y);
  w.animals.push(wolf);
  wolf.state = 'roam';
  wolf.wanderX = at.x + 12.5;
  wolf.wanderY = at.y + 0.5;
  wolf.until = w.tick + 1_000_000; // keep the goal: the point is what happens while it is unreachable
  return { w, wolf, at };
}

function runWolf(memory: boolean, ticks: number) {
  setWolfSearchMemory(memory);
  try {
    const { w, wolf } = walledGoalWorld('pathfail-wolf');
    probe.on = true;
    probeReset();
    const trail: number[] = [];
    for (let i = 0; i < ticks; i++) {
      w.tick++;
      updateWildlife(w);
      wolf.stuck = 0; // stuck detection would pick another goal: not what is being measured
      trail.push(wolf.x, wolf.y);
    }
    const calls = probeSnapshot().pathCalls;
    probe.on = false;
    probeReset();
    return { calls, trail };
  } finally {
    setWolfSearchMemory(true);
  }
}

describe('a wolf whose goal cannot be reached', () => {
  it('asks again every tick when it does not remember (the old behaviour)', () => {
    expect(runWolf(false, 60).calls).toBeGreaterThanOrEqual(55);
  });

  it('asks again only when it has moved to another tile, and walks exactly the same way', () => {
    const off = runWolf(false, 80);
    const on = runWolf(true, 80);
    expect(on.trail).toEqual(off.trail);
    // it covers about two tiles in 80 ticks (0.045 a tick): a handful of searches instead of 80
    expect(on.calls).toBeLessThanOrEqual(8);
    expect(on.calls).toBeGreaterThanOrEqual(1);
    expect(Math.hypot(on.trail[158] - on.trail[0], on.trail[159] - on.trail[1])).toBeGreaterThan(1);
  });

  it('asks again as soon as its goal moves to another tile', () => {
    const { w, wolf, at } = walledGoalWorld('pathfail-wolf-goal');
    probe.on = true;
    probeReset();
    w.tick++;
    updateWildlife(w);
    const first = probeSnapshot().pathCalls;
    w.tick++;
    updateWildlife(w); // same goal, same tile, same world: nothing new to ask
    expect(probeSnapshot().pathCalls).toBe(first);
    wolf.wanderX = at.x - 6.5; // a new goal, open ground
    wolf.wanderY = at.y + 0.5;
    w.tick++;
    updateWildlife(w);
    const after = probeSnapshot().pathCalls;
    probe.on = false;
    probeReset();
    expect(after).toBe(first + 1);
  });

  it('asks again when the solid tiles of the world have changed', () => {
    const { w } = walledGoalWorld('pathfail-wolf-epoch');
    probe.on = true;
    probeReset();
    w.tick++;
    updateWildlife(w);
    const first = probeSnapshot().pathCalls;
    w.tick++;
    updateWildlife(w);
    expect(probeSnapshot().pathCalls).toBe(first);
    solidChanged(w); // a tree felled, a building raised: the answer may be different now
    w.tick++;
    updateWildlife(w);
    const after = probeSnapshot().pathCalls;
    probe.on = false;
    probeReset();
    expect(after).toBe(first + 1);
  });
});

describe('remembering failed wolf searches changes nothing a world does', () => {
  const same = (label: string, make: () => World, ticks: number) =>
    it(label, () => {
      const run = (memory: boolean) => {
        setWolfSearchMemory(memory);
        try {
          const w = make();
          probe.on = true;
          probeReset();
          for (let i = 0; i < ticks; i++) stepWorld(w);
          const calls = probeSnapshot().pathCalls;
          probe.on = false;
          probeReset();
          return { hash: hashWorld(w), deep: deepHash(w), calls };
        } finally {
          setWolfSearchMemory(true);
        }
      };
      const without = run(false);
      const withIt = run(true);
      expect(withIt.hash).toBe(without.hash);
      expect(withIt.deep).toBe(without.deep);
      expect(withIt.calls).toBeLessThanOrEqual(without.calls);
    });

  same('an ordinary world, 3,000 ticks', () => natural('pathfail-same-ordinary'), 3000);
  same('a Large world, 1,200 ticks', () => createWorld(settingsForProfile('large', 'pathfail-same-large', { immigration: false })), 1200);
});
