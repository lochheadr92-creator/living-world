// Save-and-continue checks shared by the continuation and mid-state tests.
import { expect } from 'vitest';
import { deserializeWorld, serializeWorld } from '../../src/app/save';
import type { SpatialGrid, World } from '../../src/sim/types';
import { hashWorld } from '../../src/sim/world';

/** The path to the first place two parsed JSON values differ, or null if they are the same. */
export function firstDifference(a: unknown, b: unknown, path = '$'): string | null {
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

/**
 * The two worlds are the same world: the same fingerprint, the same serialised state down to the last byte (hashWorld skips
 * relation details, beliefs, promise and request contents, cooldowns and reservations; this does not), and the same derived
 * indexes (the ones rebuilt on loading against the ones kept up as the world ran).
 */
export function expectSameWorld(straight: World, resumed: World): void {
  expect(hashWorld(resumed)).toBe(hashWorld(straight));
  const sa = serializeWorld(straight);
  const sb = serializeWorld(resumed);
  if (sa !== sb) expect(firstDifference(JSON.parse(sa), JSON.parse(sb))).toBeNull();
  expect(sb.length).toBe(sa.length);
  expect([...resumed.byId.keys()].sort((x, y) => x - y)).toEqual([...straight.byId.keys()].sort((x, y) => x - y));
  expect(cellIds(resumed.grid)).toEqual(cellIds(straight.grid));
  expect(cellIds(resumed.pgrid)).toEqual(cellIds(straight.pgrid));
}

/** A copy of the world as a loaded save would have it, taken now. */
export function reloaded(world: World): World {
  return deserializeWorld(serializeWorld(world));
}
