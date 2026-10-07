import type { Animal, Building, Entity, Person, Plot, Site, SpatialGrid, Source, World } from './types';
import { T } from './types';

import { hyp } from './util';
// ───────── spatial grid ─────────
export const GRID_CELL = 8;

export function makeGrid(W: number, H: number): SpatialGrid {
  const cw = Math.ceil(W / GRID_CELL);
  const ch = Math.ceil(H / GRID_CELL);
  const cells: Entity[][] = [];
  for (let i = 0; i < cw * ch; i++) cells.push([]);
  return { cell: GRID_CELL, cw, ch, cells };
}

function cellIndex(g: SpatialGrid, x: number, y: number): number {
  const cx = Math.min(g.cw - 1, Math.max(0, Math.floor(x / g.cell)));
  const cy = Math.min(g.ch - 1, Math.max(0, Math.floor(y / g.cell)));
  return cy * g.cw + cx;
}

export function gridInsert(g: SpatialGrid, e: Entity, x: number, y: number): void {
  g.cells[cellIndex(g, x, y)].push(e);
}

export function gridRemove(g: SpatialGrid, e: Entity, x: number, y: number): void {
  const arr = g.cells[cellIndex(g, x, y)];
  const i = arr.indexOf(e);
  if (i >= 0) arr.splice(i, 1);
}

/** Call cb for every entity whose cell overlaps the square [x±r, y±r]. Caller filters by true distance. */
export function gridQuery(g: SpatialGrid, x: number, y: number, r: number, cb: (e: Entity) => void): void {
  const x0 = Math.max(0, Math.floor((x - r) / g.cell));
  const x1 = Math.min(g.cw - 1, Math.floor((x + r) / g.cell));
  const y0 = Math.max(0, Math.floor((y - r) / g.cell));
  const y1 = Math.min(g.ch - 1, Math.floor((y + r) / g.cell));
  for (let cy = y0; cy <= y1; cy++) {
    for (let cx = x0; cx <= x1; cx++) {
      const arr = g.cells[cy * g.cw + cx];
      for (let i = 0; i < arr.length; i++) cb(arr[i]);
    }
  }
}

/** Re-bucket persons and animals (they move every tick). */
export function rebuildMobileGrid(world: World): void {
  const g = world.pgrid;
  for (let i = 0; i < g.cells.length; i++) g.cells[i].length = 0;
  for (const p of world.persons) if (p.alive) gridInsert(g, p, p.x, p.y);
  for (const a of world.animals) gridInsert(g, a, a.x, a.y);
  for (const c of world.carts) gridInsert(g, c, c.x, c.y);
}

// ───────── ids and registration ─────────
export function newId(world: World): number {
  return world.nextId++;
}

export const tileIndex = (world: World, tx: number, ty: number): number => ty * world.W + tx;
export const inBounds = (world: World, tx: number, ty: number): boolean => tx >= 0 && ty >= 0 && tx < world.W && ty < world.H;

const solidEpochs = new WeakMap<object, number>();

/**
 * How many times the set of tiles nothing can step onto has changed in this world. A result that depends only on that set (a search that
 * found no way from one tile to another) is still the result as long as this number is. Not part of the world or a save.
 */
export function solidEpoch(world: World): number {
  return solidEpochs.get(world) ?? 0;
}

export function solidChanged(world: World): void {
  solidEpochs.set(world, (solidEpochs.get(world) ?? 0) + 1);
}

function setFootprint(world: World, e: { x: number; y: number; w: number; h: number; id: number }, solid: boolean, occ: boolean): void {
  solidChanged(world);
  for (let yy = e.y; yy < e.y + e.h; yy++) {
    for (let xx = e.x; xx < e.x + e.w; xx++) {
      if (!inBounds(world, xx, yy)) continue;
      const i = yy * world.W + xx;
      world.solid[i] = solid ? 1 : 0;
      world.occ[i] = occ ? e.id : 0;
    }
  }
}

export function registerSource(world: World, s: Source): void {
  world.sources.push(s);
  world.byId.set(s.id, s);
  gridInsert(world.grid, s, s.x + 0.5, s.y + 0.5);
  const i = s.y * world.W + s.x;
  world.occ[i] = s.id;
  if (s.solid) {
    world.solid[i] = 1;
    solidChanged(world);
  }
}

export function unregisterSource(world: World, s: Source): void {
  const i = world.sources.indexOf(s);
  if (i >= 0) world.sources.splice(i, 1);
  world.byId.delete(s.id);
  gridRemove(world.grid, s, s.x + 0.5, s.y + 0.5);
  const t = s.y * world.W + s.x;
  if (world.occ[t] === s.id) world.occ[t] = 0;
  if (s.solid) {
    world.solid[t] = 0;
    solidChanged(world);
  }
}

export function registerBuilding(world: World, b: Building): void {
  world.buildings.push(b);
  world.byId.set(b.id, b);
  gridInsert(world.grid, b, b.x + b.w / 2, b.y + b.h / 2);
  setFootprint(world, b, true, true);
}

export function unregisterBuilding(world: World, b: Building): void {
  const i = world.buildings.indexOf(b);
  if (i >= 0) world.buildings.splice(i, 1);
  world.byId.delete(b.id);
  gridRemove(world.grid, b, b.x + b.w / 2, b.y + b.h / 2);
  setFootprint(world, b, false, false);
}

export function registerSite(world: World, s: Site): void {
  world.sites.push(s);
  world.byId.set(s.id, s);
  gridInsert(world.grid, s, s.x + s.w / 2, s.y + s.h / 2);
  // an upgrade is worked on beside the home it replaces; the home keeps its footprint
  if (!s.upgradeOf) setFootprint(world, s, true, true);
}

export function unregisterSite(world: World, s: Site): void {
  const i = world.sites.indexOf(s);
  if (i >= 0) world.sites.splice(i, 1);
  world.byId.delete(s.id);
  gridRemove(world.grid, s, s.x + s.w / 2, s.y + s.h / 2);
  if (!s.upgradeOf) setFootprint(world, s, false, false);
}

export function registerPlot(world: World, p: Plot): void {
  world.plots.push(p);
  world.byId.set(p.id, p);
  gridInsert(world.grid, p, p.x + 0.5, p.y + 0.5);
  world.occ[p.y * world.W + p.x] = p.id;
}

export function unregisterPlot(world: World, p: Plot): void {
  const i = world.plots.indexOf(p);
  if (i >= 0) world.plots.splice(i, 1);
  world.byId.delete(p.id);
  gridRemove(world.grid, p, p.x + 0.5, p.y + 0.5);
  const t = p.y * world.W + p.x;
  if (world.occ[t] === p.id) world.occ[t] = 0;
}

export function registerGeneric(world: World, e: Entity): void {
  switch (e.ent) {
    case 'pile':
      world.piles.push(e);
      gridInsert(world.grid, e, e.x + 0.5, e.y + 0.5);
      break;
    case 'grave':
      world.graves.push(e);
      gridInsert(world.grid, e, e.x + 0.5, e.y + 0.5);
      world.occ[e.y * world.W + e.x] = e.id;
      world.solid[e.y * world.W + e.x] = 1;
      solidChanged(world);
      break;
    case 'person':
      world.persons.push(e);
      break;
    case 'animal':
      world.animals.push(e);
      break;
    case 'cart':
      world.carts.push(e);
      break;
    default:
      throw new Error('use dedicated register for ' + e.ent);
  }
  world.byId.set(e.id, e);
}

export function unregisterPile(world: World, e: Entity & { ent: 'pile' }): void {
  const i = world.piles.indexOf(e);
  if (i >= 0) world.piles.splice(i, 1);
  world.byId.delete(e.id);
  gridRemove(world.grid, e, e.x + 0.5, e.y + 0.5);
}

// ───────── tile queries ─────────
export function terrainAt(world: World, tx: number, ty: number): number {
  if (!inBounds(world, tx, ty)) return T.DEEP;
  return world.terrain[ty * world.W + tx];
}

export function isWalkable(world: World, tx: number, ty: number): boolean {
  if (!inBounds(world, tx, ty)) return false;
  const i = ty * world.W + tx;
  return world.terrain[i] !== T.DEEP && world.solid[i] === 0;
}

export function isWater(world: World, tx: number, ty: number): boolean {
  if (!inBounds(world, tx, ty)) return false;
  const t = world.terrain[ty * world.W + tx];
  return t === T.DEEP || t === T.SHALLOW;
}

/** A buildable tile: dry, free, not occupied. */
export function isFreeLand(world: World, tx: number, ty: number): boolean {
  if (!inBounds(world, tx, ty)) return false;
  const i = ty * world.W + tx;
  const t = world.terrain[i];
  return (t === T.GRASS || t === T.SAND || t === T.FOREST) && world.solid[i] === 0 && world.occ[i] === 0;
}

/** Does this walkable tile touch water (so a person standing there can scoop or drink)? */
export function isWaterAccess(world: World, tx: number, ty: number): boolean {
  if (!isWalkable(world, tx, ty)) return false;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if ((dx || dy) && isWater(world, tx + dx, ty + dy)) return true;
    }
  }
  return false;
}

/** The nearest walkable tile beside water to (x, y), within `maxR` tiles. Shorelines change (buildings, trees), so remembered spots get re-resolved. */
export function findWaterAccessNear(world: World, x: number, y: number, maxR = 4): { x: number; y: number } | null {
  const cx = Math.floor(x);
  const cy = Math.floor(y);
  let best: { x: number; y: number } | null = null;
  let bd = 1e9;
  for (let dy = -maxR; dy <= maxR; dy++) {
    for (let dx = -maxR; dx <= maxR; dx++) {
      const d = hyp(dx, dy);
      if (d > maxR || d >= bd) continue;
      if (isWaterAccess(world, cx + dx, cy + dy)) {
        bd = d;
        best = { x: cx + dx + 0.5, y: cy + dy + 0.5 };
      }
    }
  }
  return best;
}

export function entityPos(e: Entity): { x: number; y: number } {
  switch (e.ent) {
    case 'person':
    case 'animal':
    case 'cart':
      return { x: e.x, y: e.y };
    case 'building':
    case 'site':
      return { x: e.x + e.w / 2, y: e.y + e.h / 2 };
    default:
      return { x: e.x + 0.5, y: e.y + 0.5 };
  }
}

/** Distance from a point to the rectangle footprint of an entity (0 inside). */
export function distToFootprint(e: Entity, x: number, y: number): number {
  if (e.ent === 'building' || e.ent === 'site') {
    const dx = Math.max(e.x - x, 0, x - (e.x + e.w));
    const dy = Math.max(e.y - y, 0, y - (e.y + e.h));
    return hyp(dx, dy);
  }
  if (e.ent === 'person' || e.ent === 'animal' || e.ent === 'cart') return hyp(e.x - x, e.y - y);
  const dx = Math.max(e.x - x, 0, x - (e.x + 1));
  const dy = Math.max(e.y - y, 0, y - (e.y + 1));
  return hyp(dx, dy);
}

export function personById(world: World, id: number): Person | undefined {
  const e = world.byId.get(id);
  return e && e.ent === 'person' ? e : undefined;
}

export function animalById(world: World, id: number): Animal | undefined {
  const e = world.byId.get(id);
  return e && e.ent === 'animal' ? e : undefined;
}
