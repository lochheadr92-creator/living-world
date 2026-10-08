// Forestry: the forester's lodge (village-economy expansion, docs/BUILDINGS.md). Rich dynamics only.
//
// A thin wood near the houses is the problem: the trees people know near home are few, so wood is a long walk and the forest renews only
// as fast as it seeds itself. The lodge is a place where people plant: someone with the time goes to open ground within reach of the lodge
// and sets a young tree (a Source with growth 0.02, which updateSources then grows in SAPLING_TICKS, creating each unit of wood it gains
// in the ledger as "tree growth"). Planting creates no wood by itself. The lodge caps the number of saplings it has standing, and a
// planting never takes the wood past a quarter above the world's natural cap.
//
// Planning knowledge: whether the wood near home is thin is judged from the trees a person knows; the spot and the cap are checked on
// arrival against the world.
import { findBuildSpot } from './buildings';
import { beliefsByKind } from './optutil';
import { hubWithin } from './settlements';
import { treesNear } from './sources';
import { hashUnit } from './rng';
import { isFreeLand, isWalkable } from './registry';
import { hyp } from './util';
import type { Belief, Building, Person, World } from './types';
import { T } from './types';

/** open ground this near the lodge (tiles) is planted */
export const FOREST_REACH = 11;
/** a lodge keeps at most this many saplings standing at once (young trees that have not yet grown up) */
export const FOREST_MAX_SAPLINGS = 10;
/** work ticks to set one young tree for a person of skill 1 */
export const PLANT_WORK = 150;
/** a wood is thin near home when the person knows fewer than this many trees within FOREST_THIN_RADIUS of it */
export const FOREST_THIN = 12;
export const FOREST_THIN_RADIUS = 14;

export function saplingsAround(world: World, b: Building): number {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  let n = 0;
  for (const s of world.sources) if (s.type === 'tree' && s.growth < 1 && hyp(s.x - cx, s.y - cy) <= FOREST_REACH) n++;
  return n;
}

/** how many trees this person knows within the thin-wood radius of a point */
export function knownTreesNear(p: Person, beliefs: Belief[], x: number, y: number): number {
  void p;
  let n = 0;
  for (const b of beliefs) if (b.kind === 'tree' && hyp(b.x - x, b.y - y) <= FOREST_THIN_RADIUS) n++;
  return n;
}

/** a grown tree with wood in it within reach of the lodge: what a young tree is raised from (the planner asks the same of their beliefs) */
export function seedTreeNear(world: World, b: Building): boolean {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  for (const s of world.sources) if (s.type === 'tree' && s.growth >= 1 && s.amount >= 2 && hyp(s.x + 0.5 - cx, s.y + 0.5 - cy) <= FOREST_REACH) return true;
  return false;
}

/** where to stand to set a tree on this tile: the walkable neighbour nearest the person, or the tile itself */
export function standBeside(world: World, p: Person, spot: { x: number; y: number }): { x: number; y: number } {
  let best = { x: spot.x + 0.5, y: spot.y + 0.5 };
  let bestD = Infinity;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const x = spot.x + dx;
      const y = spot.y + dy;
      if (!isWalkable(world, x, y)) continue;
      const d = hyp(x + 0.5 - p.x, y + 0.5 - p.y);
      if (d < bestD) {
        bestD = d;
        best = { x: x + 0.5, y: y + 0.5 };
      }
    }
  }
  return best;
}

/**
 * Where a lodge goes: at the wood's edge, between home and the nearest grown trees this person knows of, so that a tree to raise
 * young ones from stands within the lodge's reach and the new wood grows toward the houses. Null when no grown tree is known.
 */
export function lodgeSpot(world: World, p: Person, hx: number, hy: number): { x: number; y: number } | null {
  const near = beliefsByKind(p, ['tree'])
    .filter((b) => b.amount >= 2)
    .sort((a, c) => hyp(a.x - hx, a.y - hy) - hyp(c.x - hx, c.y - hy))
    .slice(0, 5);
  if (!near.length) return null;
  let tx = 0;
  let ty = 0;
  for (const b of near) {
    tx += b.x;
    ty += b.y;
  }
  tx /= near.length;
  ty /= near.length;
  return findBuildSpot(world, p, 'forester', (hx + tx) / 2, (hy + ty) / 2, 1, 7, 3);
}

/** may another young tree be set in this world at all? (a quarter above the natural cap is the ceiling) */
export function roomForTrees(world: World): boolean {
  return (world.stats.trees ?? 0) < Math.round((world.stats.treeCap ?? 0) * 1.25);
}

/** open ground within reach of the lodge that is good for a young tree: free, explored by this person, not in the camp, not at the water's edge */
export function plantingSpot(world: World, p: Person, at: { x: number; y: number }, salt = 0): { x: number; y: number } | null {
  const cx = at.x;
  const cy = at.y;
  let best: { x: number; y: number } | null = null;
  let bestScore = -1e9;
  const r = Math.ceil(FOREST_REACH);
  for (let y = Math.max(1, Math.floor(cy) - r); y <= Math.min(world.H - 2, Math.floor(cy) + r); y++) {
    for (let x = Math.max(1, Math.floor(cx) - r); x <= Math.min(world.W - 2, Math.floor(cx) + r); x++) {
      const d = hyp(x + 0.5 - cx, y + 0.5 - cy);
      if (d < 2.5 || d > FOREST_REACH) continue;
      if (!isFreeLand(world, x, y)) continue;
      const t = world.terrain[y * world.W + x];
      if (t !== T.GRASS && t !== T.FOREST) continue;
      if (p.explored[y * world.W + x] === 0) continue;
      if (world.waterDist[y * world.W + x] <= 1) continue;
      if (hubWithin(world, x, y, 4)) continue;
      const crowd = treesNear(world, x, y, 2);
      if (crowd > 4) continue;
      // near the lodge and near other trees (a copse, not a lone stick), a little scatter so spots differ between tries
      const score = -d * 0.35 + Math.min(crowd, 3) * 0.6 + hashUnit(x, y, 211 + salt) * 0.8;
      if (score > bestScore) {
        bestScore = score;
        best = { x, y };
      }
    }
  }
  return best;
}
