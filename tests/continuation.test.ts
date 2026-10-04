import { describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import type { SpatialGrid, World } from '../src/sim/types';
import { hashWorld } from '../src/sim/world';
import { natural, run } from './helpers/util';

/** The path to the first place two parsed JSON values differ, or null if they are the same. */
function firstDifference(a: unknown, b: unknown, path = '$'): string | null {
  if (a === b) return null;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null || Array.isArray(a) !== Array.isArray(b)) {
    return `${path}: ${JSON.stringify(a)?.slice(0, 120)} vs ${JSON.stringify(b)?.slice(0, 120)}`;
  }
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.join() !== kb.join()) return `${path}: keys [${ka.join(',').slice(0, 200)}] vs [${kb.join(',').slice(0, 200)}]`;
  for (const k of ka) {
    const d = firstDifference((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${path}.${k}`);
    if (d) return d;
  }
  return null;
}

/** what a spatial index holds, cell by cell (order inside a cell is how it was filled, not part of the state) */
const cellIds = (g: SpatialGrid) => g.cells.map((c) => c.map((e) => e.id).sort((x, y) => x - y));

function expectSameWorld(straight: World, resumed: World): void {
  expect(hashWorld(resumed)).toBe(hashWorld(straight));
  const sa = serializeWorld(straight);
  const sb = serializeWorld(resumed);
  if (sa !== sb) expect(firstDifference(JSON.parse(sa), JSON.parse(sb))).toBeNull();
  expect(sb.length).toBe(sa.length);
  // the derived indexes rebuilt on loading hold the same things as the ones kept up as the world ran
  expect([...resumed.byId.keys()].sort((x, y) => x - y)).toEqual([...straight.byId.keys()].sort((x, y) => x - y));
  expect(cellIds(resumed.grid)).toEqual(cellIds(straight.grid));
  expect(cellIds(resumed.pgrid)).toEqual(cellIds(straight.pgrid));
}

describe('saving half way and carrying on gives exactly the world that was never saved', () => {
  // Each seed runs T ticks straight; a second copy runs T/2, is saved and loaded, and runs the other T/2.
  // The whole serialised world is compared, not only hashWorld (which skips relation details, beliefs, promise and
  // request contents, cooldowns and reservations).
  for (const [seed, T] of [['meadow', 9000], ['river', 16000]] as const) {
    it(`${seed}: ${T / 2} + save/load + ${T / 2} ticks equals ${T} ticks`, () => {
      const straight = natural(seed);
      run(straight, T);
      let resumed = natural(seed);
      run(resumed, T / 2);
      resumed = deserializeWorld(serializeWorld(resumed));
      run(resumed, T / 2);
      expect(resumed.tick).toBe(T);
      expectSameWorld(straight, resumed);
    }, 240_000);
  }
});
